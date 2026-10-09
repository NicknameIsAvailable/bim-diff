import { Inflate } from "fflate";

export const IFCZIP_LIMITS = {
  archive: 256 * 1024 ** 2,
  model: 512 * 1024 ** 2,
  entries: 4096,
};
const crcTable = Uint32Array.from({ length: 256 }, (_, value) => {
  for (let bit = 0; bit < 8; bit++)
    value = value & 1 ? 0xedb88320 ^ (value >>> 1) : value >>> 1;
  return value >>> 0;
});

/** Extracts exactly one STEP IFC in a worker, with bounded output and CRC verification.
 * ZIP64, encryption and multi-volume archives are intentionally unsupported.
 * Entries are never written to disk; unrelated entries are never inflated.
 */
export function extractIfcZip(
  bytes: Uint8Array,
  limits = IFCZIP_LIMITS,
): Uint8Array {
  const fail = (reason: string): never => {
    throw new Error(`IFCZIP: ${reason}`);
  };
  if (bytes.length > limits.archive) fail("архив превышает лимит размера");
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  let end = -1;
  for (let p = bytes.length - 22; p >= Math.max(0, bytes.length - 65557); p--) {
    if (
      view.getUint32(p, true) === 0x06054b50 &&
      p + 22 + view.getUint16(p + 20, true) === bytes.length
    ) {
      end = p;
      break;
    }
  }
  if (end < 0) fail("повреждённый или неполный ZIP");
  const count = view.getUint16(end + 10, true);
  const directorySize = view.getUint32(end + 12, true);
  const directory = view.getUint32(end + 16, true);
  if (
    view.getUint16(end + 4, true) ||
    view.getUint16(end + 6, true) ||
    view.getUint16(end + 8, true) !== count
  )
    fail("многотомный ZIP не поддерживается");
  if (
    count === 65535 ||
    directory === 0xffffffff ||
    directorySize === 0xffffffff
  )
    fail("ZIP64 не поддерживается");
  if (count > limits.entries || directory + directorySize !== end)
    fail("некорректный каталог или слишком много файлов");
  type Entry = {
    flags: number;
    method: number;
    crc: number;
    size: number;
    packed: number;
    offset: number;
    name: Uint8Array;
  };
  const models: Entry[] = [];
  let cursor = directory;
  for (let i = 0; i < count; i++) {
    if (cursor + 46 > end || view.getUint32(cursor, true) !== 0x02014b50)
      fail("повреждённый каталог ZIP");
    const nameLength = view.getUint16(cursor + 28, true);
    const next =
      cursor +
      46 +
      nameLength +
      view.getUint16(cursor + 30, true) +
      view.getUint16(cursor + 32, true);
    if (next > end) fail("неполная запись ZIP");
    const name = bytes.subarray(cursor + 46, cursor + 46 + nameLength);
    const filename = new TextDecoder().decode(name);
    if (/\.ifcxml$/i.test(filename))
      fail("IFCXML не поддерживается; нужен один файл .ifc");
    if (/\.ifc$/i.test(filename)) {
      if (view.getUint16(cursor + 34, true))
        fail("многотомный ZIP не поддерживается");
      models.push({
        flags: view.getUint16(cursor + 8, true),
        method: view.getUint16(cursor + 10, true),
        crc: view.getUint32(cursor + 16, true),
        packed: view.getUint32(cursor + 20, true),
        size: view.getUint32(cursor + 24, true),
        offset: view.getUint32(cursor + 42, true),
        name,
      });
    }
    cursor = next;
  }
  if (cursor !== end) fail("некорректный размер каталога");
  if (models.length !== 1) fail("архив должен содержать ровно один файл .ifc");
  const entry = models[0]!;
  if (entry.flags & 0x41) fail("зашифрованный ZIP не поддерживается");
  if (entry.method !== 0 && entry.method !== 8)
    fail("поддерживаются только ZIP Store и Deflate");
  if (!entry.size || entry.size > limits.model)
    fail("распакованный IFC превышает лимит размера или пуст");
  if (
    entry.offset + 30 > directory ||
    view.getUint32(entry.offset, true) !== 0x04034b50
  )
    fail("повреждённый заголовок файла");
  const localNameLength = view.getUint16(entry.offset + 26, true);
  const start =
    entry.offset +
    30 +
    localNameLength +
    view.getUint16(entry.offset + 28, true);
  if (
    start + entry.packed > directory ||
    view.getUint16(entry.offset + 6, true) !== entry.flags ||
    view.getUint16(entry.offset + 8, true) !== entry.method
  )
    fail("некорректные данные файла");
  const localName = bytes.subarray(
    entry.offset + 30,
    entry.offset + 30 + localNameLength,
  );
  if (
    localName.length !== entry.name.length ||
    localName.some((x, i) => x !== entry.name[i])
  )
    fail("имя файла не совпадает с каталогом");
  const output = new Uint8Array(entry.size);
  let written = 0;
  let crc = 0xffffffff;
  let finished = false;
  const consume = (chunk: Uint8Array, final: boolean) => {
    if (written + chunk.length > output.length)
      fail("распакованные данные превышают заявленный размер");
    output.set(chunk, written);
    written += chunk.length;
    for (const byte of chunk) crc = crcTable[(crc ^ byte) & 255]! ^ (crc >>> 8);
    finished = final;
  };
  const packed = bytes.subarray(start, start + entry.packed);
  if (entry.method === 0) consume(packed, true);
  else {
    const inflate = new Inflate(consume);
    // Small input chunks bound temporary expansion before enforcing the output limit.
    for (let p = 0; p < packed.length; p += 4096)
      inflate.push(packed.subarray(p, p + 4096), p + 4096 >= packed.length);
  }
  if (
    !finished ||
    written !== entry.size ||
    (crc ^ 0xffffffff) >>> 0 !== entry.crc
  )
    fail("повреждённый IFC: размер или CRC не совпадает");
  if (
    !new TextDecoder()
      .decode(output.subarray(0, 256))
      .trimStart()
      .startsWith("ISO-10303-21;")
  )
    fail("в архиве нет IFC STEP (ISO-10303-21)");
  return output;
}
