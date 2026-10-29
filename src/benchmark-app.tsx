import React, { useEffect, useRef, useState } from "react";

import { overlayColors, type BenchmarkRunner, type DiffMethod, type ProtocolOptions, type ResearchInput, type ResearchMode } from "./ui-contracts";
import { Results } from "./results";

import type { BenchmarkReport } from "../packages/bim-diff-core/src/index.js";

import "./style.css";
/** Downloads outside the measurement interval, retaining a repeatable export action. */
function download(report: BenchmarkReport) {
  const url = URL.createObjectURL(
    new Blob([JSON.stringify(report, null, 2)], { type: "application/json" }),
  );
  const a = document.createElement("a");
  a.href = url;
  a.download = `doc-1760-${Date.now()}.json`;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
export function BenchmarkApp({ runProtocol, fixtureBaseUrl = "./bim-research/", hasArcPair = false }: { runProtocol?: BenchmarkRunner; fixtureBaseUrl?: string; hasArcPair?: boolean }) {
  const host = useRef<HTMLDivElement>(null);
  const abort = useRef<AbortController | undefined>(undefined);
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState("Готов к запуску");
  const [report, setReport] = useState<BenchmarkReport>();
  const [pair, setPair] = useState("properties");
  useEffect(() => () => abort.current?.abort(), []);
  const [mode, setMode] = useState<ResearchMode>("overlay-a");
  const [scenario, setScenario] = useState<ProtocolOptions["scenario"]>("frag");
  const [diffMethod, setDiffMethod] = useState<DiffMethod>("overlay-v1");
  useEffect(() => {
    if (diffMethod === "ifc-wasm-v1") setScenario("ifc");
  }, [diffMethod]);
  const [device, setDevice] = useState("");
  const [diagnostic, setDiagnostic] = useState(false);
  const [files, setFiles] = useState<(File | undefined)[]>([]);
  const [confirmed, setConfirmed] = useState(false);
  const run = async () => {
    if (busy || !runProtocol) return;
    setBusy(true);
    setReport(undefined);
    const controller = new AbortController();
    abort.current = controller;
    try {
      const ext = scenario === "ifc" ? "ifc" : "frag";
      const inputs = await Promise.all(
        [0, 1].map(async (i) => {
          const file = files[i];
          if (pair === "custom") {
            if (!file) throw new Error("Выберите оба файла");
            if (!confirmed) throw new Error("Подтвердите координаты и единицы");
            const format = file.name.toLowerCase().split(".").pop();
            if (format !== "ifc" && format !== "ifczip" && format !== "frag")
              throw new Error("Поддерживаются .ifc, .ifczip и .frag");
            if (format === "ifczip" && file.size > 256 * 1024 ** 2)
              throw new Error("IFCZIP: архив превышает лимит 256 MiB");
            return {
              name: file.name,
              bytes: new Uint8Array(await file.arrayBuffer()),
              format,
              metersPerUnit: 1,
              coordinateSystem: "user-confirmed-common",
            } as ResearchInput;
          }
          const name =
            pair === "arc"
              ? `arc-${i === 0 ? "a" : "b"}.${ext}`
              : pair === "controlled"
                ? `controlled-${i === 0 ? "a" : "b"}.${ext}`
                : `simple-wall-v${i === 0 || pair === "self" ? 1 : 2}.${ext}`;
          const response = await fetch(new URL(name, new URL(fixtureBaseUrl, document.baseURI)), {
            signal: controller.signal,
          });
          if (!response.ok) throw new Error(`Fixture ${response.status}`);
          return {
            name,
            bytes: new Uint8Array(await response.arrayBuffer()),
            format: ext,
            metersPerUnit: 1,
            coordinateSystem:
              pair === "arc" ? "arc-common-source" : "fixture-local",
          } as ResearchInput;
        }),
      );
      if (scenario === "ifc" && inputs.some((x) => x.format === "frag"))
        throw new Error("Полный IFC-сценарий требует два IFC / IFCZIP");
      if (scenario === "frag" && inputs.some((x) => x.format !== "frag"))
        throw new Error("FRAG-сценарий требует два подготовленных FRAG");
      controller.signal.throwIfAborted();
      const result = await runProtocol(
        host.current!,
        [inputs[0]!, inputs[1]!],
        {
          mode,
          scenario,
          diffMethod,
          device,
          diagnostic,
          duration: diagnostic ? 1500 : 30000,
          repeats: diagnostic ? 1 : 5,
        },
        controller.signal,
        setStatus,
        (r) => setReport({ ...r }),
      );
      setReport(result);
      setStatus(
        result.runs.some((r) => r.status !== "complete")
          ? "Прогон завершён с ошибкой или отменён; частичный отчёт сохранён"
          : "Готово. Отчёт скачан.",
      );
      download(result);
    } catch (error) {
      setStatus(String(error));
    } finally {
      setBusy(false);
    }
  };
  return (
    <main>
      <header>
        <p className="eyebrow">GRAPHDOC / RESEARCH / DOC-1760</p>
        <h1>BIM Overlay Lab</h1>
        <p>Сравнение версий, стоимость подготовки и повторного открытия</p>
        <span className="badge">Эксперимент · без серверного сохранения</span>
      </header>
      <section className="controls">
        <fieldset disabled={busy}>
          <label>
            Тестовая пара
            <select value={pair} onChange={(e) => setPair(e.target.value)}>
              <option value="properties">
                Simple Wall · изменение свойств
              </option>
              <option value="controlled">
                Контролируемые изменения · все категории
              </option>
              {hasArcPair && <option value="arc">ARC · FireRatingAdded</option>}
              <option value="self">Simple Wall · модель против себя</option>
              <option value="custom">Свои IFC / IFCZIP / FRAG</option>
            </select>
          </label>
          <label>
            Режим
            <select
              value={mode}
              onChange={(e) => setMode(e.target.value as ResearchMode)}
            >
              <option value="single">Single · новая версия</option>
              <option value="parallel">Parallel · две сцены</option>
              <option value="overlay-a">A · две модели в сцене</option>
              <option value="overlay-b">B · новая + subset старой</option>
            </select>
          </label>
          <label>
            Сценарий
            <select
              value={scenario}
              onChange={(e) =>
                setScenario(e.target.value as ProtocolOptions["scenario"])
              }
            >
              <option value="frag">Подготовленные FRAG</option>
              <option value="ifc">Полный путь от IFC / IFCZIP</option>
              <option value="indexes">Diff готовых индексов</option>
              <option value="cached">Повторное открытие из кеша</option>
            </select>
          </label>
          <label>
            Differ
            <select
              value={diffMethod}
              onChange={(e) => setDiffMethod(e.target.value as DiffMethod)}
            >
              <option value="overlay-v1">Overlay v1 · существующий</option>
              <option value="ifc-wasm-v1">IFC WASM · Zig</option>
            </select>
          </label>
          <label>
            Устройство
            <input
              value={device}
              onChange={(e) => setDevice(e.target.value)}
              placeholder="Модель, RAM, GPU, ОС, питание"
            />
          </label>
          <label className="check">
            <input
              type="checkbox"
              checked={diagnostic}
              onChange={(e) => setDiagnostic(e.target.checked)}
            />
            Короткая диагностика (не для выводов)
          </label>
          {pair === "custom" && (
            <div>
              <p>
                IFCZIP: один .ifc, архив до 256 MiB, распакованный IFC до 512
                MiB. Файлы остаются в браузере. FRAG должен быть в метрах; обе
                версии — в одной системе координат.
              </p>
              {[0, 1].map((i) => (
                <label key={i}>
                  {i ? "Новая версия" : "Старая версия"}
                  <input
                    type="file"
                    accept=".ifc,.ifczip,.frag"
                    onChange={(e) =>
                      setFiles((previous) => {
                        const next = [...previous];
                        next[i] = e.target.files?.[0];
                        return next;
                      })
                    }
                  />
                </label>
              ))}
              <label className="check">
                <input
                  type="checkbox"
                  checked={confirmed}
                  onChange={(e) => setConfirmed(e.target.checked)}
                />
                Подтверждаю совместимость координат и единиц
              </label>
            </div>
          )}
        </fieldset>
        <div className="actions">
          <button disabled={busy || !runProtocol} onClick={() => void run()}>
            Запустить
          </button>
          <button disabled={!busy} onClick={() => abort.current?.abort()}>
            Отмена
          </button>
          <button
            disabled={!report || busy}
            onClick={() => report && download(report)}
          >
            Скачать JSON повторно
          </button>
        </div>
        {!runProtocol && <p className="hint">Предпросмотр интерфейса: движок бенчмарка не подключён. Сравнение и замеры недоступны.</p>}
        <p role="status">{status}</p>
        <p className="hint">
          1280 × 720 · DPR 1 · 1 прогрев + 5 повторов · 30 секунд камеры · не
          скрывайте вкладку
        </p>
      </section>
      <div className="legend">
        {Object.entries(overlayColors).map(([key, color]) => (
          <span key={key}>
            <i style={{ background: color }} />
            {key}
          </span>
        ))}
      </div>
      <div className="viewport" ref={host} />
      {report && <Results report={report} />}
      <footer>
        Оценки памяти ограничены возможностями браузера. Аппаратная приёмка: 8
        GB RAM / iGPU и контрольное устройство.
      </footer>
    </main>
  );
}
