import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import {
  FragmentsModels,
  RenderedFaces,
  type FragmentsModel,
  type MaterialDefinition,
} from "@thatopen/fragments";
import type { DiffArtifact } from "../packages/bim-diff-core/src/index.js";
import {
  groupChanges,
  type PreviewSideGroups,
  type PreviewStyle,
} from "./ifc-preview-groups";
import { ImportClient, type ImportAssets } from "./ifc-preview-import";
import { overlayColors } from "./ui-contracts";

export type PreviewInput = { name: string; bytes: Uint8Array };

export type IfcPreviewAssets = ImportAssets & {
  /** Same-origin URL of `@thatopen/fragments` `worker.mjs`. */
  fragmentsWorkerUrl: string;
};

export type IfcPreviewMetrics = {
  status: "complete" | "failed" | "cancelled";
  error?: string;
  totalMs: number;
  convertMs: number;
  loadMs: number;
  highlightMs: number;
  fragBytes: { left: number; right: number };
  models: number;
  geometries: number;
  textures: number;
  changed: number;
};

export type IfcPreviewOptions = {
  container: HTMLElement;
  left: PreviewInput;
  right: PreviewInput;
  artifact: Pick<DiffArtifact, "changes">;
  assets: IfcPreviewAssets;
  signal?: AbortSignal;
  /** Defaults to true. Set to false to require the user's click. */
  autoStart?: boolean;
  onMetrics?: (metrics: IfcPreviewMetrics) => void;
};

export type IfcPreviewHandle = {
  /** Resolves once the preview has loaded, failed, or the user never started it. */
  ready: Promise<IfcPreviewMetrics | null>;
  dispose: () => void;
};

type Viewer = {
  pane: HTMLElement;
  renderer: THREE.WebGLRenderer;
  scene: THREE.Scene;
  camera: THREE.PerspectiveCamera;
  controls: OrbitControls;
  model?: FragmentsModel;
};

type StyleDefinition = {
  color: string;
  opacity: number;
  transparent: boolean;
  depthWrite: boolean;
};

/**
 * Mirrors the old overlay viewer: changed elements are solid highlights,
 * removed/modified-old are translucent so the element behind stays visible,
 * and unchanged geometry is kept on screen but strongly dimmed.
 */
const styles: Record<PreviewStyle, StyleDefinition> = {
  unchanged: {
    color: overlayColors.unchanged,
    opacity: 0.16,
    transparent: true,
    depthWrite: false,
  },
  unknown: {
    color: overlayColors.unknown,
    opacity: 0.45,
    transparent: true,
    depthWrite: false,
  },
  removed: {
    color: overlayColors.removed,
    opacity: 0.45,
    transparent: true,
    depthWrite: false,
  },
  "modified-old": {
    color: overlayColors["modified-old"],
    opacity: 0.45,
    transparent: true,
    depthWrite: false,
  },
  added: {
    color: overlayColors.added,
    opacity: 1,
    transparent: false,
    depthWrite: true,
  },
  "modified-new": {
    color: overlayColors["modified-new"],
    opacity: 1,
    transparent: false,
    depthWrite: true,
  },
};

const leftChanged: PreviewStyle[] = ["removed", "modified-old", "unknown"];
const rightChanged: PreviewStyle[] = ["added", "modified-new", "unknown"];
const background = "#eff2f6";

export function mountIfcWasmPreview(options: IfcPreviewOptions): IfcPreviewHandle {
  const { container, left, right, artifact, assets, signal } = options;
  const groups = groupChanges(artifact);
  let startedAt = performance.now();

  const previousChildren = [...container.children];
  const shell = document.createElement("div");
  shell.dataset.ifcPreview = "true";
  shell.style.cssText =
    "position:relative;display:grid;grid-template-columns:1fr 1fr;width:100%;height:100%;min-height:0;background:#eaf0f6;font:12px/1.4 system-ui,sans-serif;color:#22303f;overflow:hidden;";

  const viewers: Viewer[] = [
    createViewer(shell, "Старая версия", left.name),
    createViewer(shell, "Новая версия", right.name),
  ];

  const status = document.createElement("div");
  status.style.cssText =
    "position:absolute;left:50%;bottom:10px;transform:translateX(-50%);max-width:90%;padding:6px 10px;border-radius:6px;background:rgba(255,255,255,.88);box-shadow:0 1px 4px rgba(20,35,55,.16);font-size:12px;color:#31455c;pointer-events:none;";
  status.textContent = "3D-превью: ожидание";
  shell.append(status);

  const gate = document.createElement("div");
  gate.style.cssText =
    "position:absolute;inset:0;display:none;align-items:center;justify-content:center;flex-direction:column;gap:10px;background:rgba(239,242,246,.86);backdrop-filter:blur(2px);text-align:center;padding:24px;";
  const gateText = document.createElement("p");
  gateText.style.cssText = "max-width:540px;margin:0;color:#31455c;";
  const gateButton = document.createElement("button");
  gateButton.type = "button";
  gateButton.textContent = "Показать 3D-превью";
  gateButton.style.cssText =
    "padding:8px 16px;border:1px solid #2c4a6b;border-radius:6px;background:#2c4a6b;color:#fff;font:inherit;cursor:pointer;";
  gate.append(gateText, gateButton);
  shell.append(gate);

  container.replaceChildren(shell);

  const totalBytes = left.bytes.byteLength + right.bytes.byteLength;
  const autoStart = options.autoStart ?? true;
  gate.style.display = autoStart ? "none" : "flex";
  if (!autoStart) {
    gateText.textContent = `Модели занимают ${formatBytes(totalBytes)}. Геометрия загружается отдельно от замера и может занять заметное время и память.`;
  }

  let disposed = false;
  let resolveReady: (value: IfcPreviewMetrics | null) => void = () => {};
  const ready = new Promise<IfcPreviewMetrics | null>((resolve) => {
    resolveReady = resolve;
  });
  let animation = 0;
  let updating = false;
  let lastRenderError: unknown;

  const resize = () => {
    for (const viewer of viewers) {
      const width = viewer.pane.clientWidth;
      const height = viewer.pane.clientHeight;
      if (width <= 0 || height <= 0) continue;
      viewer.renderer.setSize(width, height, false);
      viewer.camera.aspect = width / height;
      viewer.camera.updateProjectionMatrix();
    }
  };
  const observer = new ResizeObserver(resize);
  observer.observe(shell);

  const render = () => {
    if (disposed) return;
    animation = requestAnimationFrame(render);
    for (const viewer of viewers) viewer.controls.update();
    if (fragments && !updating) {
      updating = true;
      fragments
        .update()
        .catch((error) => {
          lastRenderError = error;
        })
        .finally(() => {
          updating = false;
        });
    }
    for (const viewer of viewers)
      viewer.renderer.render(viewer.scene, viewer.camera);
  };
  animation = requestAnimationFrame(render);

  let fragments: FragmentsModels | undefined;
  let fragmentsWorkerBlob: string | undefined;
  let convert: ImportClient | undefined;
  let started = false;

  const start = () => {
    if (started || disposed) return;
    started = true;
    startedAt = performance.now();
    gate.style.display = "none";
    void run().catch((error) => {
      if (disposed) return;
      const metrics = failed(error, startedAt, fragments);
      status.textContent = `3D-превью недоступно: ${String(error)}`;
      options.onMetrics?.(metrics);
      resolveReady(metrics);
    });
  };

  gateButton.addEventListener("click", start);

  const run = async () => {
    throwIfAborted(signal);
    status.textContent = "3D-превью: подготовка геометрии…";
    const convertStart = performance.now();
    const convertSide = async (
      input: PreviewInput,
      label: string,
      index: number,
    ): Promise<Uint8Array> => {
      const client = (convert ??= new ImportClient(assets));
      return client.call(input.bytes, signal, (progress) => {
        status.textContent = `3D-превью: геометрия ${index}/2 (${label}) · ${Math.round(progress * 100)}%`;
      });
    };
    const leftFrag = await convertSide(left, "старая", 1);
    throwIfAborted(signal);
    const rightFrag = await convertSide(right, "новая", 2);
    const convertMs = performance.now() - convertStart;
    convert?.dispose();
    convert = undefined;
    throwIfAborted(signal);

    status.textContent = "3D-превью: загрузка моделей…";
    const loadStart = performance.now();
    // Fetch the worker and use a blob URL, like the old overlay viewer. This
    // keeps `npm start` working even though its static server does not map
    // `.mjs` to a JavaScript content type.
    const workerResponse = await fetch(assets.fragmentsWorkerUrl, { signal });
    if (!workerResponse.ok)
      throw new Error(`Fragments worker ${workerResponse.status}`);
    fragmentsWorkerBlob = URL.createObjectURL(
      new Blob([await workerResponse.text()], { type: "text/javascript" }),
    );
    fragments = new FragmentsModels(fragmentsWorkerBlob, {
      maxWorkers: 2,
    });
    fragments.settings.autoCoordinate = false;
    const modelLeft = await fragments.load(leftFrag, {
      modelId: "left",
      camera: viewers[0]!.camera,
    });
    throwIfAborted(signal);
    const modelRight = await fragments.load(rightFrag, {
      modelId: "right",
      camera: viewers[1]!.camera,
    });
    throwIfAborted(signal);
    viewers[0]!.model = modelLeft;
    viewers[1]!.model = modelRight;
    modelLeft.useCamera(viewers[0]!.camera);
    modelRight.useCamera(viewers[1]!.camera);
    viewers[0]!.scene.add(modelLeft.object);
    viewers[1]!.scene.add(modelRight.object);
    await fragments.update(true);
    const loadMs = performance.now() - loadStart;

    status.textContent = "3D-превью: раскраска изменений…";
    const highlightStart = performance.now();
    await Promise.all([
      applyGroups(modelLeft, groups.left, leftChanged),
      applyGroups(modelRight, groups.right, rightChanged),
    ]);
    await fragments.update(true);
    const highlightMs = performance.now() - highlightStart;
    throwIfAborted(signal);
    if (disposed) return;

    // Fit each side independently. The two revisions may keep different
    // georeferenced origins, so a union box can make both models microscopic.
    fitCamera(viewers[0]!, [modelLeft.box]);
    fitCamera(viewers[1]!, [modelRight.box]);

    const changed = artifact.changes.filter(
      (change) => change.kind !== "unchanged",
    ).length;
    const metrics: IfcPreviewMetrics = {
      status: "complete",
      totalMs: performance.now() - startedAt,
      convertMs,
      loadMs,
      highlightMs,
      fragBytes: {
        left: leftFrag.byteLength,
        right: rightFrag.byteLength,
      },
      models: fragments.models.list.size,
      geometries: viewers.reduce(
        (sum, viewer) => sum + viewer.renderer.info.memory.geometries,
        0,
      ),
      textures: viewers.reduce(
        (sum, viewer) => sum + viewer.renderer.info.memory.textures,
        0,
      ),
      changed,
    };
    status.textContent = `3D-превью готово · ${changed} изменений · ${Math.round(metrics.totalMs)} ms вне замера`;
    if (lastRenderError)
      console.warn("IFC preview render error", lastRenderError);
    options.onMetrics?.(metrics);
    resolveReady(metrics);
  };

  if (autoStart) start();

  const dispose = () => {
    if (disposed) return;
    disposed = true;
    cancelAnimationFrame(animation);
    observer.disconnect();
    signal?.removeEventListener("abort", dispose);
    convert?.dispose();
    convert = undefined;
    if (fragments) {
      fragments.abort("left");
      fragments.abort("right");
      void fragments.dispose().catch(() => {});
    }
    if (fragmentsWorkerBlob) {
      URL.revokeObjectURL(fragmentsWorkerBlob);
      fragmentsWorkerBlob = undefined;
    }
    for (const viewer of viewers) {
      viewer.controls.dispose();
      viewer.renderer.dispose();
      viewer.renderer.forceContextLoss();
      viewer.renderer.domElement.remove();
    }
    shell.remove();
    if (previousChildren.length) container.append(...previousChildren);
    resolveReady(null);
  };

  if (signal) {
    if (signal.aborted) {
      // Defer so the caller gets a handle first.
      queueMicrotask(dispose);
    } else {
      signal.addEventListener("abort", dispose, { once: true });
    }
  }

  return { ready, dispose };
}

function createViewer(
  shell: HTMLElement,
  label: string,
  name: string,
): Viewer {
  const pane = document.createElement("div");
  pane.style.cssText =
    "position:relative;min-width:0;min-height:0;overflow:hidden;background:#eff2f6;";
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  renderer.setPixelRatio(1);
  renderer.domElement.style.cssText =
    "display:block;width:100%;height:100%;outline:none;";
  pane.append(renderer.domElement);

  const tag = document.createElement("div");
  tag.style.cssText =
    "position:absolute;top:8px;left:8px;max-width:calc(100% - 16px);overflow:hidden;text-overflow:ellipsis;white-space:nowrap;padding:4px 8px;border-radius:5px;background:rgba(255,255,255,.8);font-size:11px;color:#31455c;pointer-events:none;";
  tag.textContent = `${label} · ${name}`;
  pane.append(tag);

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(background);
  scene.add(new THREE.AmbientLight(0xffffff, 2));
  const directional = new THREE.DirectionalLight(0xffffff, 2);
  directional.position.set(10, 20, 10);
  scene.add(directional);

  const camera = new THREE.PerspectiveCamera(50, 1, 0.01, 1e7);
  camera.position.set(10, 10, 10);
  const controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.dampingFactor = 0.12;

  shell.append(pane);
  return { pane, renderer, scene, camera, controls };
}

function materialFor(style: PreviewStyle): MaterialDefinition {
  const definition = styles[style];
  return {
    color: new THREE.Color(definition.color),
    opacity: definition.opacity,
    transparent: definition.transparent,
    depthWrite: definition.depthWrite,
    renderedFaces: RenderedFaces.TWO,
  };
}

async function applyGroups(
  model: FragmentsModel,
  groups: PreviewSideGroups,
  order: PreviewStyle[],
): Promise<void> {
  // Dim every item with geometry. Elements absent from the artifact (for
  // example objects without a GlobalId) are still context, not changes.
  const all = await model.getItemsIdsWithGeometry();
  if (all.length) await model.highlight(all, materialFor("unchanged"));

  for (const style of order) {
    const guids = groups[style];
    if (!guids?.length) continue;
    const localIds = (
      await model.getLocalIdsByGuids(guids)
    ).filter((id): id is number => id !== null);
    if (localIds.length) await model.highlight(localIds, materialFor(style));
  }
}

function fitCamera(viewer: Viewer, boxes: THREE.Box3[]) {
  const bounds = new THREE.Box3();
  for (const box of boxes) if (!box.isEmpty()) bounds.union(box);
  if (bounds.isEmpty()) return;
  const sphere = bounds.getBoundingSphere(new THREE.Sphere());
  sphere.radius = Math.max(sphere.radius, 0.001);
  const direction = new THREE.Vector3(1, 0.8, 1).normalize();
  const distance =
    (sphere.radius * 1.35) /
    Math.sin(THREE.MathUtils.degToRad(viewer.camera.fov) / 2);
  viewer.camera.position
    .copy(sphere.center)
    .addScaledVector(direction, distance);
  viewer.camera.near = Math.max(sphere.radius / 1000, 0.001);
  viewer.camera.far = sphere.radius * 100;
  viewer.camera.updateProjectionMatrix();
  viewer.controls.target.copy(sphere.center);
  viewer.controls.update();
}

function throwIfAborted(signal: AbortSignal | undefined) {
  if (signal?.aborted) throw new DOMException("Cancelled", "AbortError");
}

function failed(
  error: unknown,
  startedAt: number,
  fragments: FragmentsModels | undefined,
): IfcPreviewMetrics {
  return {
    status: isAbort(error) ? "cancelled" : "failed",
    error: String(error),
    totalMs: performance.now() - startedAt,
    convertMs: 0,
    loadMs: 0,
    highlightMs: 0,
    fragBytes: { left: 0, right: 0 },
    models: fragments?.models.list.size ?? 0,
    geometries: 0,
    textures: 0,
    changed: 0,
  };
}

function isAbort(error: unknown): boolean {
  return (
    error instanceof DOMException &&
    (error.name === "AbortError" || error.message === "Cancelled")
  );
}

function formatBytes(bytes: number): string {
  if (bytes >= 1024 ** 3) return `${(bytes / 1024 ** 3).toFixed(1)} GiB`;
  if (bytes >= 1024 ** 2) return `${(bytes / 1024 ** 2).toFixed(0)} MiB`;
  return `${(bytes / 1024).toFixed(0)} KiB`;
}
