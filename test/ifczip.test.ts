import { test } from "node:test";
import assert from "node:assert/strict";
import { zipSync, strToU8, type Zippable } from "fflate";
import {
  extractIfcZip,
  IFCZIP_LIMITS,
} from "../src/ifczip";
const ifc = strToU8(
  "ISO-10303-21;\nHEADER;ENDSEC;DATA;ENDSEC;END-ISO-10303-21;",
);
for (const level of [0, 6] as const)
  test(`round trip method ${level}`, () => {
    const zip = zipSync(
      { "folder/MODEL.IFC": ifc, "notes.txt": strToU8("ignored") },
      { level },
    );
    assert.deepEqual(extractIfcZip(zip), ifc);
  });
test("rejects zero and multiple models, XML and disguised non-IFC", () => {
  for (const files of [
    { "a.txt": ifc },
    { "a.ifc": ifc, "b.ifc": ifc },
    { "a.ifcxml": ifc },
    { "a.ifc": strToU8("not IFC") },
  ] as Zippable[])
    assert.throws(() => extractIfcZip(zipSync(files)), /IFCZIP/);
});
test("rejects truncation and CRC damage", () => {
  const zip = zipSync({ "a.ifc": ifc }, { level: 0 });
  assert.throws(() => extractIfcZip(zip.subarray(0, zip.length - 5)), /IFCZIP/);
  zip[40] ^= 1;
  assert.throws(() => extractIfcZip(zip), /CRC/);
});
test("enforces archive, output and entry limits", () => {
  const zip = zipSync({ "a.ifc": ifc });
  for (const limits of [
    { ...IFCZIP_LIMITS, archive: 1 },
    { ...IFCZIP_LIMITS, model: 1 },
    { ...IFCZIP_LIMITS, entries: 0 },
  ])
    assert.throws(() => extractIfcZip(zip, limits), /IFCZIP/);
});
test("rejects advertised size mismatch and encryption", () => {
  const zip = zipSync({ "a.ifc": ifc });
  const v = new DataView(zip.buffer);
  const central = v.getUint32(zip.length - 6, true);
  v.setUint32(central + 24, 1, true);
  assert.throws(() => extractIfcZip(zip), /размер/);
  v.setUint16(central + 8, 1, true);
  assert.throws(() => extractIfcZip(zip), /зашифрованный/);
});
