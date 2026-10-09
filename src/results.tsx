import type { BenchmarkReport, Metric } from "../packages/bim-diff-core/src/index.js";

const labels: Record<string, string> = {
  fps: "FPS · фактический рендер (медленная сцена)",
  onePercentLowFps: "1% low FPS · по p99 интервала",
  frameTime_p50: "Время кадра · p50",
  frameTime_p95: "Время кадра · p95",
  frameTime_p99: "Время кадра · p99",
  browserCpu_mean: "CPU браузера · среднее (100% = 1 ядро)",
  browserCpu_max: "CPU браузера · пик",
  systemCpu_mean: "CPU всей системы · среднее",
  systemCpu_max: "CPU всей системы · пик",
  systemGpu_mean: "GPU всей системы · среднее",
  systemGpu_max: "GPU всей системы · пик",
  gpuTime_mean: "GPU-время рендера · среднее",
  gpuTime_p95: "GPU-время рендера · p95",
  browserRss_max: "RAM процессов браузера · пик RSS",
  jsHeap_max: "JS heap главного потока · пик",
  jsHeapDelta: "JS heap · изменение за прогон",
  systemRamUsed_max: "RAM всей системы · пик (включая кеши)",
  systemGpuMemory_max: "Память GPU всей системы · пик",
  rendererTaskBusy_mean: "Занятость renderer tasks · среднее (CDP)",
  firstContentfulFrame: "Первый кадр с моделью",
  renderDuration: "Длительность движения камеры",
  renderedFrames: "Количество отрисованных кадров",
  framesOver33ms: "Интервалы кадров > 33 мс",
  framesOver50ms: "Интервалы кадров > 50 мс",
  longTasks: "Длинные задачи (> 50 мс)",
  totalBlockingTime: "Блокировка сверх 50 мс",
  eventLoopLag_p95: "Задержка event loop · p95",
  cameraCommand_p95: "Время команды камеры · p95",
  callsPeak: "Draw calls · пик на кадр/сцену",
  trianglesPeak: "Треугольники · пик на кадр/сцену",
  geometriesPeak: "Геометрии · пик на сцену",
  texturesPeak: "Текстуры · пик на сцену",
};
function value(metric?: Metric) {
  if (!metric || metric.value === null) return "Н/Д";
  const n = metric.unit === "bytes" ? metric.value / 1048576 : metric.value;
  return `${n.toLocaleString("ru-RU", { maximumFractionDigits: 2 })} ${metric.unit === "bytes" ? "MiB" : metric.unit}`;
}
export function Results({ report }: { report: BenchmarkReport }) {
  const measured = report.runs.filter((run) => !run.warmup);
  return (
    <section className="results">
      <h2>Результат по прогонам</h2>
      <p>
        {measured.length} измеряемых прогонов;{" "}
        {measured.filter((run) => !run.valid).length} невалидных /
        диагностических. Прогрев хранится отдельно в JSON.
      </p>
      <p>
        CPU/GPU системы включают другие приложения. RAM браузера — сумма RSS
        процессов выделенного Chromium. Н/Д означает отсутствие измерения;
        причина указана в подробностях.
      </p>
      <div className="metrics-scroll">
        <table className="metrics-table">
          <thead>
            <tr>
              <th>Метрика</th>
              {measured.map((run) => (
                <th key={run.repetition}>
                  Прогон {run.repetition + 1}
                  <small>
                    {run.status}
                    {!run.valid ? " · невалидный" : ""}
                  </small>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {Object.entries(labels).map(([key, label]) => (
              <tr key={key}>
                <th>{label}</th>
                {measured.map((run) => (
                  <td key={run.repetition} title={run.metrics[key]?.reason}>
                    {value(run.metrics[key])}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {report.runs.map((run) => (
        <details key={run.repetition}>
          <summary>
            {run.warmup ? "Прогрев" : `Прогон ${run.repetition + 1}`} · все
            метрики, этапы и причины недоступности
          </summary>
          <p>
            {run.startedAt} · {run.mode} · {run.scenario} · {run.status}
          </p>
          {run.issues.length > 0 && <p>{run.issues.join("; ")}</p>}
          {run.error && <p>{run.error}</p>}
          <table className="metrics-table">
            <tbody>
              {Object.entries(run.metrics).map(([key, metric]) => (
                <tr key={key}>
                  <th>{labels[key] ?? key}</th>
                  <td>{value(metric)}</td>
                  <td>{metric.reason}</td>
                </tr>
              ))}
              {Object.entries(run.stages).map(([key, ms]) => (
                <tr key={`stage-${key}`}>
                  <th>Этап: {key}</th>
                  <td>{value({ value: ms, unit: "ms" })}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <p>
            Сырые ряды в JSON:{" "}
            {Object.entries(run.samples ?? {})
              .map(([key, samples]) => `${key}: ${samples.length}`)
              .join(" · ")}
          </p>
          <pre>
            {JSON.stringify(
              { cache: run.cache, resources: run.resources },
              null,
              2,
            )}
          </pre>
        </details>
      ))}
      <details>
        <summary>Сводка по валидным прогонам и категории изменений</summary>
        <pre>
          {JSON.stringify(
            { categories: report.inputs.categories, summary: report.summary },
            null,
            2,
          )}
        </pre>
      </details>
    </section>
  );
}
