import type { BenchmarkRun, Metric } from "../packages/bim-diff-core/src/index.js";
/** Renderer-neutral measurement input, owned by the benchmark. */
export type FrameSample = {
  source?: string;
  gpuTimeMs?: number | null;
  gpuTimeReason?: string;
  time: number;
  calls: number;
  triangles: number;
  geometries: number;
  textures: number;
};

export function distribution(values: number[]) {
  const sorted = values.filter(Number.isFinite).sort((a, b) => a - b);
  const percentile = (p: number) =>
    sorted.length ? sorted[Math.ceil(p * sorted.length) - 1]! : null;
  return {
    min: sorted[0] ?? null,
    mean: sorted.length
      ? sorted.reduce((a, b) => a + b, 0) / sorted.length
      : null,
    p50: percentile(0.5),
    p95: percentile(0.95),
    p99: percentile(0.99),
    max: sorted.at(-1) ?? null,
  };
}

/** Samples the whole run, but calculates render FPS only during the camera phase. */
export function measure(run: BenchmarkRun) {
  const start = performance.now(),
    startedWall = Date.now();
  run.startedAt = new Date().toISOString();
  const raw = (run.samples = {
    frames: [],
    raf: [],
    camera: [],
    browser: [],
    longTasks: [],
    longAnimationFrames: [],
    events: [],
    system: [],
    resources: [],
  } as NonNullable<BenchmarkRun["samples"]>);
  let active = true,
    phase = "preparation",
    renderStart: number | undefined,
    first: number | undefined;
  const frames = new Map<string, number[]>();
  const commandToFrame: number[] = [];
  let pendingCamera: number | undefined;
  const gpuTimes: number[] = [],
    cameraTimes: number[] = [],
    eventLags: number[] = [],
    rafTimes: number[] = [];
  const longTasks: PerformanceEntry[] = [];
  const observers: PerformanceObserver[] = [];
  const heap = () =>
    (
      performance as Performance & {
        memory?: {
          usedJSHeapSize: number;
          totalJSHeapSize: number;
          jsHeapSizeLimit: number;
        };
      }
    ).memory;
  const heapBefore = heap()?.usedJSHeapSize;
  const metric = (
    name: string,
    value: number | null,
    unit: string,
    reason?: string,
  ) => {
    run.metrics[name] = {
      value,
      unit,
      ...(reason || value === null
        ? { reason: reason ?? "API unavailable or no samples during this run" }
        : {}),
    };
  };
  const stats = (
    name: string,
    values: number[],
    unit: string,
    reason?: string,
  ) => {
    for (const [key, value] of Object.entries(distribution(values)))
      metric(
        `${name}_${key}`,
        value,
        unit,
        value === null ? (reason ?? "No samples") : undefined,
      );
  };
  const visibility = () => {
    if (document.hidden) {
      run.valid = false;
      run.issues.push("Tab hidden during run");
    }
  };
  document.addEventListener("visibilitychange", visibility);
  visibility();
  const observe = (
    type: string,
    consume: (entries: PerformanceEntry[]) => void,
  ) => {
    if (!PerformanceObserver.supportedEntryTypes.includes(type)) return false;
    const observer = new PerformanceObserver((list) =>
      consume(list.getEntries()),
    );
    observer.observe({
      type,
      ...(type === "event" ? { durationThreshold: 16 } : {}),
    });
    observers.push(observer);
    return true;
  };
  const tasksSupported = observe("longtask", (entries) => {
    longTasks.push(...entries);
    raw.longTasks!.push(
      ...entries.map((e) => ({
        time: e.startTime - start,
        duration: e.duration,
        name: e.name,
      })),
    );
  });
  observe("long-animation-frame", (entries) =>
    raw.longAnimationFrames!.push(
      ...entries.map((e) => ({ ...e.toJSON(), time: e.startTime - start })),
    ),
  );
  observe("event", (entries) =>
    raw.events!.push(
      ...entries.map((e) => ({ ...e.toJSON(), time: e.startTime - start })),
    ),
  );
  let nextTick = performance.now() + 250;
  const browserTimer = setInterval(() => {
    const now = performance.now(),
      lag = Math.max(0, now - nextTick);
    nextTick = now + 250;
    eventLags.push(lag);
    const memory = heap();
    raw.browser!.push({
      time: now - start,
      phase,
      eventLoopLagMs: lag,
      usedJSHeapSize: memory?.usedJSHeapSize ?? null,
      totalJSHeapSize: memory?.totalJSHeapSize ?? null,
      jsHeapSizeLimit: memory?.jsHeapSizeLimit ?? null,
    });
  }, 250);
  let raf = 0,
    lastRaf: number | undefined;
  const tick = (now: number) => {
    if (!active) return;
    if (phase === "render" && lastRaf !== undefined) {
      rafTimes.push(now - lastRaf);
      raw.raf!.push({ time: now - start, interval: now - lastRaf });
    }
    lastRaf = now;
    raf = requestAnimationFrame(tick);
  };
  raf = requestAnimationFrame(tick);
  const frame = (sample: FrameSample) => {
    if (!active) return;
    if (sample.triangles > 0 && first === undefined)
      first = sample.time - start;
    const source = sample.source ?? "overlay";
    if (pendingCamera !== undefined) {
      commandToFrame.push(Math.max(0, sample.time - pendingCamera));
      pendingCamera = undefined;
    }
    raw.frames!.push({ ...sample, time: sample.time - start, phase, source });
    if (phase === "render") {
      const times = frames.get(source) ?? [];
      const previous = times.at(-1);
      if (previous !== undefined) run.frameTimes.push(sample.time - previous);
      times.push(sample.time);
      frames.set(source, times);
      run.renderedFrames++;
      if (sample.gpuTimeMs != null) gpuTimes.push(sample.gpuTimeMs);
    }
    if (sample.gpuTimeMs == null && !run.metrics.gpuTimePeak)
      metric(
        "gpuTimePeak",
        null,
        "ms",
        sample.gpuTimeReason ?? "GPU timer unavailable",
      );
    for (const key of ["calls", "triangles", "geometries", "textures"] as const)
      metric(
        key + "Peak",
        Math.max(run.metrics[key + "Peak"]?.value ?? 0, sample[key]),
        "count",
      );
  };
  let lastSystemTimestamp: string | undefined;
  let systemPending: Promise<void> | undefined;
  const systemController = new AbortController();
  const token = new URLSearchParams(location.search).get("telemetry") ?? "";
  const sampleSystem = () => {
    if (systemPending || !active || !["127.0.0.1", "localhost"].includes(location.hostname)) return;
    const sampledPhase = phase;
    systemPending = fetch(
      `http://127.0.0.1:4177/sample?token=${encodeURIComponent(token)}`,
      {
        signal: AbortSignal.any([
          systemController.signal,
          AbortSignal.timeout(1500),
        ]),
      },
    )
      .then(async (response) => {
        if (!response.ok) throw new Error(`Collector HTTP ${response.status}`);
        return response.json();
      })
      .then((data) => {
        if (
          active &&
          data.sampledAt !== lastSystemTimestamp &&
          Date.parse(data.sampledAt) >= startedWall
        ) {
          lastSystemTimestamp = data.sampledAt;
          raw.system!.push({
            time: performance.now() - start,
            phase: sampledPhase,
            ...data,
          });
        }
      })
      .catch(() => undefined)
      .finally(() => {
        systemPending = undefined;
      });
  };
  sampleSystem();
  const systemTimer = setInterval(sampleSystem, 1000);
  return {
    frame,
    beginRender() {
      phase = "render";
      renderStart = performance.now();
      lastRaf = undefined;
    },
    camera(ms: number) {
      cameraTimes.push(ms);
      raw.camera!.push({ time: performance.now() - start, duration: ms });
      if (pendingCamera === undefined) pendingCamera = performance.now() - ms;
    },
    finish() {
      active = false;
      clearInterval(browserTimer);
      clearInterval(systemTimer);
      systemController.abort();
      cancelAnimationFrame(raf);
      document.removeEventListener("visibilitychange", visibility);
      // Drain queued entries before disconnecting.
      observers.forEach((o) => {
        const entries = o.takeRecords();
        for (const e of entries)
          if (e.entryType === "longtask") {
            longTasks.push(e);
            raw.longTasks!.push({
              time: e.startTime - start,
              duration: e.duration,
              name: e.name,
            });
          }
        o.disconnect();
      });
      const end = performance.now(),
        duration = renderStart === undefined ? 0 : end - renderStart;
      metric("runDuration", end - start, "ms");
      metric("renderDuration", duration, "ms");
      metric(
        "firstContentfulFrame",
        first ?? null,
        "ms",
        first === undefined ? "No model triangles observed" : undefined,
      );
      metric("renderedFrames", run.renderedFrames, "count");
      const fps: number[] = [];
      for (const [source, times] of frames) {
        const rate = duration > 0 ? (times.length * 1000) / duration : null;
        metric(`fps_${source}`, rate, "fps");
        if (rate !== null) fps.push(rate);
        stats(
          `frameTime_${source}`,
          times.slice(1).map((t, i) => t - times[i]!),
          "ms",
        );
      }
      metric(
        "fps",
        fps.length ? Math.min(...fps) : null,
        "fps",
        "Actual render callbacks per camera-phase second; parallel reports the slower canvas, not their sum",
      );
      stats("frameTime", run.frameTimes, "ms");
      stats("rafInterval", rafTimes, "ms");
      stats("gpuTime", gpuTimes, "ms", run.metrics.gpuTimePeak?.reason);
      metric(
        "gpuTimePeak",
        gpuTimes.length ? Math.max(...gpuTimes) : null,
        "ms",
        gpuTimes.length
          ? undefined
          : (run.metrics.gpuTimePeak?.reason ?? "No GPU timer samples"),
      );
      metric(
        "framesOver33ms",
        run.frameTimes.filter((t) => t > 33.333).length,
        "count",
      );
      metric(
        "framesOver50ms",
        run.frameTimes.filter((t) => t > 50).length,
        "count",
      );
      metric(
        "onePercentLowFps",
        distribution(run.frameTimes).p99
          ? 1000 / distribution(run.frameTimes).p99!
          : null,
        "fps",
        "1000 / p99 frame interval; pooled per-canvas intervals",
      );
      stats("cameraCommand", cameraTimes, "ms");
      stats("cameraToNextFrame", commandToFrame, "ms");
      stats("eventLoopLag", eventLags, "ms");
      metric(
        "longTasks",
        tasksSupported ? longTasks.length : null,
        "count",
        tasksSupported ? undefined : "Long Tasks API unavailable",
      );
      metric(
        "longTasksDuration",
        tasksSupported ? longTasks.reduce((a, b) => a + b.duration, 0) : null,
        "ms",
      );
      metric(
        "totalBlockingTime",
        tasksSupported
          ? longTasks.reduce((a, b) => a + Math.max(0, b.duration - 50), 0)
          : null,
        "ms",
        "Sum of long-task duration beyond 50 ms over this run; not Lighthouse navigation TBT",
      );
      const heaps = raw
        .browser!.map(
          (s) => (s as { usedJSHeapSize: number | null }).usedJSHeapSize,
        )
        .filter((n): n is number => n !== null);
      stats("jsHeap", heaps, "bytes", "JS heap API unavailable");
      metric(
        "mainThreadHeapPeak",
        heaps.length ? Math.max(...heaps) : null,
        "bytes",
        "Main-thread JS heap estimate; excludes worker heaps and GPU",
      );
      metric("jsHeapBefore", heapBefore ?? null, "bytes");
      metric("jsHeapAfter", heap()?.usedJSHeapSize ?? null, "bytes");
      metric(
        "jsHeapDelta",
        heapBefore === undefined || !heap()
          ? null
          : heap()!.usedJSHeapSize - heapBefore,
        "bytes",
      );
      for (const name of [
        "systemCpu",
        "systemRamUsed",
        "systemRamTotal",
        "systemGpu",
        "systemGpuMemory",
        "browserCpu",
        "browserRss",
        "rendererTaskBusy",
      ]) {
        const samples = raw.system!.flatMap((s) => {
          const m = (s as { metrics: Record<string, Metric> }).metrics[name];
          return m?.value != null ? [m.value] : [];
        });
        const unit =
          name.toLowerCase().includes("ram") ||
          name === "browserRss" ||
          name === "systemGpuMemory"
            ? "bytes"
            : "%";
        const lastSample = raw.system!.at(-1) as
          | { metrics: Record<string, Metric> }
          | undefined;
        const reason =
          lastSample?.metrics[name]?.reason ??
          "Local telemetry collector unavailable. System CPU/GPU/RAM collection is enabled only on localhost; hosted runs retain browser metrics.";
        stats(name, samples, unit, reason);
        for (const key of Object.keys(distribution(samples)))
          run.metrics[`${name}_${key}`]!.reason = reason;
      }
      const cdpSamples = raw.system!.flatMap((s) => {
        const details = (s as { details?: { cdp?: Record<string, number> } })
          .details;
        return details?.cdp ? [details.cdp] : [];
      });
      for (const name of [
        "Nodes",
        "Documents",
        "Frames",
        "JSEventListeners",
        "LayoutObjects",
        "JSHeapUsedSize",
        "JSHeapTotalSize",
      ]) {
        stats(
          "cdp" + name,
          cdpSamples.map((s) => s[name]!).filter(Number.isFinite),
          name.includes("Heap") ? "bytes" : "count",
          "Requires dedicated CDP browser",
        );
      }
      for (const name of [
        "TaskDuration",
        "ScriptDuration",
        "LayoutDuration",
        "RecalcStyleDuration",
        "LayoutCount",
        "RecalcStyleCount",
      ]) {
        const values = cdpSamples.map((s) => s[name]!).filter(Number.isFinite);
        const seconds = name.endsWith("Duration");
        metric(
          "cdp" + name + "Delta",
          values.length > 1
            ? Math.max(0, values.at(-1)! - values[0]!) * (seconds ? 1000 : 1)
            : null,
          seconds ? "ms" : "count",
          "Difference between first/last CDP samples within run; excludes unsampled boundaries",
        );
      }
      metric(
        "totalRamPeak",
        run.metrics.browserRss_max?.value ?? null,
        "bytes",
        "Managed browser process RSS sum, including workers/GPU process; shared pages may be counted more than once. Requires collector --browser.",
      );
      metric(
        "eventTimingCount",
        PerformanceObserver.supportedEntryTypes.includes("event")
          ? raw.events!.length
          : null,
        "count",
        "Only real user input events over browser reporting threshold; synthetic camera route is not input latency",
      );
      metric(
        "longAnimationFrames",
        PerformanceObserver.supportedEntryTypes.includes("long-animation-frame")
          ? raw.longAnimationFrames!.length
          : null,
        "count",
        "Long Animation Frames API; raw script attribution in JSON when supported",
      );
      raw.resources!.push(
        ...performance
          .getEntriesByType("resource")
          .filter((e) => e.startTime >= start && e.startTime <= end)
          .map((e) => {
            const entry = e.toJSON();
            if (entry.name?.startsWith("http://127.0.0.1:4177/"))
              entry.name = "http://127.0.0.1:4177/sample";
            return entry;
          }),
      );
      metric(
        "resourceTransferBytes",
        raw.resources!.reduce<number>(
          (sum, e) =>
            sum + ((e as { transferSize?: number }).transferSize ?? 0),
          0,
        ),
        "bytes",
        "Resource Timing entries started in this run; excludes files acquired before the run",
      );
    },
  };
}
