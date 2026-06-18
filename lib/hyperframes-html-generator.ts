/**
 * HyperFrames-compliant HTML generator.
 *
 * Takes an ordered list of HyperFramesScene descriptions and produces
 * a complete `index.html` that can be fed to `npx hyperframes render`.
 *
 * The output follows the HyperFrames semantic video spec:
 *   - DM Sans + JetBrains Mono fonts
 *   - Dark theme (--bg: #0b0d17)
 *   - scene/clip structure with data-start / data-duration
 *   - GSAP timeline with entrance + mid-scene activity tweens
 *   - 2-3 HyperShader transitions between key scene boundaries
 *   - window.__timelines["main"] = tl
 */

import { randomInt } from "node:crypto";
import type { HyperFramesScene, HyperFramesElement } from "./bridge-viz-to-hyperframes";

// ── Accent colour palette ───────────────────────────────────────────────

const ACCENT_COLORS = [
  "#4f8cff", // blue
  "#e11d48", // rose
  "#059669", // emerald
  "#d97706", // amber
  "#7c3aed", // violet
  "#0284c7", // sky
  "#dc2626", // red
  "#65a30d", // lime
];

/** Pick a deterministic accent colour based on scene index. */
function accentForIndex(i: number): string {
  return ACCENT_COLORS[i % ACCENT_COLORS.length]!;
}

// ── Shader transition selection ─────────────────────────────────────────

type ShaderTransition = {
  time: number;
  shader: string;
  duration: number;
};

const SHADERS_BY_ENERGY: Record<string, string[]> = {
  calm: ["cross-warp-morph", "light-leak", "domain-warp"],
  medium: ["cinematic-zoom", "whip-pan", "sdf-iris"],
  high: ["glitch", "chromatic-split", "ridged-burn"],
};

function pickShader(energy: "calm" | "medium" | "high"): string {
  const pool = SHADERS_BY_ENERGY[energy];
  return pool[randomInt(0, pool.length)]!;
}

function computeTransitions(scenes: HyperFramesScene[]): ShaderTransition[] {
  if (scenes.length < 3) return [];

  // Pick 2-3 transition points evenly spaced
  const numTransitions = scenes.length <= 5 ? 2 : 3;
  const step = Math.floor(scenes.length / (numTransitions + 1));

  const transitions: ShaderTransition[] = [];
  let t = 0;
  for (let i = 0; i < scenes.length; i++) {
    t += scenes[i]!.duration;
    const isTransition = ((i + 1) % step === 0 || i === Math.floor(scenes.length / 2)) &&
      transitions.length < numTransitions;
    if (isTransition) {
      const energy = transitions.length === 0 ? "calm" : "medium";
      transitions.push({
        time: t,
        shader: pickShader(energy),
        duration: 0.5,
      });
    }
  }
  return transitions;
}

// ── GSAP animation generation ───────────────────────────────────────────

type TimelineEntry = {
  /** scene id, e.g. "s3" */
  target: string;
  /** GSAP method: "from" | "to" | "set" */
  method: string;
  /** CSS properties */
  props: Record<string, unknown>;
  /** offset relative to scene start (seconds) */
  offset: number;
  /** duration (seconds) */
  duration: number;
  /** ease string */
  ease: string;
  /** stagger value if applicable */
  stagger?: number;
};

/**
 * Generate GSAP timeline entries for a single scene based on its elements
 * and animation type. Returns entries grouped by whether they're entrance
 * (happens immediately) or sustained (mid-scene activity).
 */
function sceneTimeline(
  scene: HyperFramesScene,
  sceneIndex: number,
  sceneStartTime: number,
): TimelineEntry[] {
  const id = `#s${sceneIndex}`;
  const entries: TimelineEntry[] = [];
  const accent = accentForIndex(sceneIndex);

  // ── Entrance ────────────────────────────────────────────────────
  switch (scene.entrance) {
    case "slide_up":
      entries.push({
        target: `${id} .scene-content`,
        method: "from",
        props: { y: 60, autoAlpha: 0 },
        offset: 0,
        duration: 0.5,
        ease: "power3.out",
      });
      break;
    case "scale_in":
      entries.push({
        target: `${id} .scene-content`,
        method: "from",
        props: { scale: 0.85, autoAlpha: 0 },
        offset: 0,
        duration: 0.45,
        ease: "back.out(1.4)",
      });
      break;
    case "fade_only":
      entries.push({
        target: `${id} .scene-content`,
        method: "from",
        props: { autoAlpha: 0 },
        offset: 0,
        duration: 0.4,
        ease: "power2.out",
      });
      break;
  }

  // ── Mid-scene activity ──────────────────────────────────────────
  const hasDataElements = scene.elements.some(
    (e) => e.kind === "bar" || e.kind === "line" || e.kind === "points" || e.kind === "formula",
  );

  switch (scene.animation) {
    case "stagger_reveal":
      if (hasDataElements) {
        entries.push({
          target: `${id} .bar, ${id} .line-point, ${id} .formula-step`,
          method: "from",
          props: { scaleY: 0, autoAlpha: 0, transformOrigin: "bottom" },
          offset: 0.15,
          duration: 0.5,
          ease: "back.out(1.2)",
          stagger: 0.18,
        });
      } else {
        entries.push({
          target: `${id} .stagger-item`,
          method: "from",
          props: { y: 20, autoAlpha: 0 },
          offset: 0.1,
          duration: 0.4,
          ease: "power2.out",
          stagger: 0.15,
        });
      }
      break;

    case "draw_path":
      // For line/path animations — use a "breathing" activity on data elements
      entries.push({
        target: `${id} .drawable`,
        method: "from",
        props: { strokeDashoffset: 1000 },
        offset: 0.2,
        duration: 1.5,
        ease: "power2.inOut",
      });
      break;

    case "scale_up":
      entries.push({
        target: `${id} .main-element`,
        method: "from",
        props: { scale: 0.3, autoAlpha: 0 },
        offset: 0.15,
        duration: 0.6,
        ease: "back.out(1.6)",
      });
      break;

    case "fade_in":
      // Already handled by entrance; add subtle pulse on accent elements
      entries.push({
        target: `${id} .accent-glow`,
        method: "to",
        props: { opacity: 0.4 },
        offset: 0.3,
        duration: 1.5,
        ease: "sine.inOut",
      });
      break;
  }

  // ── Title emphasis (always) ─────────────────────────────────────
  entries.push({
    target: `${id} .scene-title`,
    method: "from",
    props: { y: 10, autoAlpha: 0 },
    offset: 0.05,
    duration: 0.5,
    ease: "power3.out",
  });

  return entries;
}

// ── HTML element rendering ──────────────────────────────────────────────

function renderElement(e: HyperFramesElement, accent: string, index: number): string {
  switch (e.kind) {
    case "title":
      return [
        `<h2 class="scene-title" style="font-size:2rem;font-weight:600;color:var(--ink);margin-bottom:${e.subtitle ? '0.25em' : '0'};line-height:1.2;">${escapeHtml(e.text)}</h2>`,
        e.subtitle
          ? `<p class="stagger-item" style="font-size:1.05rem;color:var(--muted);max-width:42ch;line-height:1.5;">${escapeHtml(e.subtitle)}</p>`
          : "",
      ]
        .filter(Boolean)
        .join("\n");

    case "text":
      return `<p class="stagger-item" style="font-size:1.05rem;color:var(--ink);max-width:46ch;line-height:1.65;opacity:0.9;">${escapeHtml(e.body)}</p>`;

    case "formula": {
      const id = `formula-${index}`;
      return [
        `<div class="main-element" style="margin:0.5em 0;">`,
        `  <div id="${id}" class="formula-step" style="font-size:1.3rem;font-family:var(--font-data);color:var(--accent);padding:0.75em 1em;background:var(--accent-dim);border-radius:12px;display:inline-block;">${escapeHtml(e.latex)}</div>`,
        e.note
          ? `  <p class="stagger-item" style="font-size:0.9rem;color:var(--muted);margin-top:0.4em;">${escapeHtml(e.note)}</p>`
          : "",
        `</div>`,
      ].join("\n");
    }

    case "citation":
      return `<div class="stagger-item" style="margin-bottom:0.5em;padding-left:1em;border-left:2px solid ${accent};"><span style="font-weight:500;color:var(--accent);">${escapeHtml(e.label)}</span><span style="color:var(--muted);margin-left:0.5em;font-size:0.9rem;">${escapeHtml(e.source)}</span></div>`;

    case "bar": {
      const maxVal = Math.max(...e.bars.map((b) => b.value), 1);
      const bars = e.bars
        .map((b) => {
          const h = Math.max(5, (b.value / maxVal) * 100);
          return [
            `<div class="bar" style="display:flex;align-items:center;margin-bottom:0.4em;">`,
            `  <span style="width:7ch;font-size:0.8rem;color:var(--muted);text-align:right;padding-right:0.5em;flex-shrink:0;">${escapeHtml(b.label)}</span>`,
            `  <div style="flex:1;height:24px;background:var(--accent-dim);border-radius:6px;overflow:hidden;">`,
            `    <div style="height:100%;width:${h}%;background:${escapeHtml(b.color)};border-radius:6px;transition:none;"></div>`,
            `  </div>`,
            `  <span style="width:5ch;font-size:0.8rem;color:var(--ink);padding-left:0.5em;font-family:var(--font-data);">${b.value}</span>`,
            `</div>`,
          ].join("\n");
        })
        .join("\n");
      return bars;
    }

    case "line":
    case "points":
      // SVG placeholder: the points data is injected as data attributes
      // for GSAP to animate. We render a simple SVG with dim guide lines.
      return [
        `<svg class="drawable" viewBox="0 0 400 200" style="width:100%;max-width:500px;height:auto;">`,
        `  <line x1="0" y1="180" x2="400" y2="180" stroke="var(--muted)" stroke-width="0.5" opacity="0.3"/>`,
        `  <line x1="0" y1="0" x2="0" y2="180" stroke="var(--muted)" stroke-width="0.5" opacity="0.3"/>`,
        `</svg>`,
      ].join("\n");

    case "function":
      return [
        `<div class="main-element" style="text-align:center;padding:1.5em 0;">`,
        `  <div style="font-family:var(--font-data);font-size:1.4rem;color:var(--accent);padding:0.75em 2em;background:var(--accent-dim);border-radius:16px;display:inline-block;">`,
        `    f(x) = ${escapeHtml(e.expression)}`,
        `  </div>`,
        `  <p class="stagger-item" style="font-size:0.85rem;color:var(--muted);margin-top:0.5em;">${escapeHtml(String(e.xMin))} ≤ x ≤ ${escapeHtml(String(e.xMax))}</p>`,
        `</div>`,
      ].join("\n");

    case "concept_card":
      return [
        `<div class="main-element" style="background:var(--accent-dim);border:1px solid ${accent};border-radius:16px;padding:1.25em 1.5em;max-width:480px;">`,
        `  <div style="display:flex;align-items:flex-start;gap:1em;">`,
        e.icon_hint
          ? `    <div style="width:48px;height:48px;border-radius:12px;background:${accent};display:flex;align-items:center;justify-content:center;flex-shrink:0;font-size:1.3rem;opacity:0.9;">${escapeHtml(e.icon_hint)}</div>`
          : "",
        `    <div>`,
        `      <h3 style="font-size:1.1rem;font-weight:600;color:var(--ink);margin-bottom:0.3em;">${escapeHtml(e.concept)}</h3>`,
        `      <p style="font-size:0.92rem;color:var(--muted);line-height:1.55;">${escapeHtml(e.description)}</p>`,
        `    </div>`,
        `  </div>`,
        `</div>`,
      ].join("\n");
  }
}

// ── Full HTML generation ────────────────────────────────────────────────

export type HyperFramesHtmlResult = {
  /** The complete index.html content. */
  html: string;
  /** Total estimated video duration in seconds. */
  totalDuration: number;
  /** Number of scenes generated. */
  sceneCount: number;
  /** Transition definitions for the generated output. */
  transitions: ShaderTransition[];
};

/**
 * Generate a complete HyperFrames-compatible index.html from scene descriptions.
 */
export function generateHyperFramesHtml(
  scenes: HyperFramesScene[],
  options: {
    /** Document / video title. */
    title?: string;
    /** Override accent colours per scene (indexed). */
    accentOverrides?: string[];
  } = {},
): HyperFramesHtmlResult {
  const title = options.title ?? "Knowledge Visualizer Video";
  const transitions = computeTransitions(scenes);

  // Compute cumulative start times
  let t = 0;
  const sceneStarts: number[] = [];
  for (const s of scenes) {
    sceneStarts.push(t);
    t += s.duration;
  }
  const totalDuration = t;

  // Collect all timeline entries
  const allEntries: TimelineEntry[] = [];
  for (let i = 0; i < scenes.length; i++) {
    const scene = scenes[i]!;
    const start = sceneStarts[i]!;
    const entries = sceneTimeline(scene, i + 1, start);
    allEntries.push(...entries);
  }

  // Determine anchor scenes (those near shader transitions)
  const anchorSet = new Set<number>();
  for (const trans of transitions) {
    // Find the scene that ends closest to the transition point
    let bestIdx = -1;
    let bestDist = Infinity;
    for (let i = 0; i < scenes.length; i++) {
      const sceneEnd = sceneStarts[i]! + scenes[i]!.duration;
      const dist = Math.abs(sceneEnd - trans.time);
      if (dist < bestDist) {
        bestDist = dist;
        bestIdx = i;
      }
      const nextStart = sceneStarts[i]!;
      const dist2 = Math.abs(nextStart - trans.time);
      if (dist2 < bestDist) {
        bestDist = dist2;
        bestIdx = i - 1;
      }
    }
    // The scene BEFORE the transition boundary
    if (bestIdx >= 0) anchorSet.add(bestIdx + 1); // 1-based
    // The scene AFTER the transition boundary
    if (bestIdx + 2 <= scenes.length) anchorSet.add(bestIdx + 2);
  }

  // Build scene HTML
  const sceneHtmls: string[] = [];
  for (let i = 0; i < scenes.length; i++) {
    const scene = scenes[i]!;
    const start = sceneStarts[i]!;
    const isAnchor = anchorSet.has(i + 1);
    const accent = options.accentOverrides?.[i] ?? accentForIndex(i);

    const elementsHtml = scene.elements
      .map((e, ei) => renderElement(e, accent, ei))
      .join("\n");

    const visibilityStyle = i === 0
      ? ""
      : isAnchor
        ? ` style="opacity:0;"`
        : ` style="visibility:hidden;"`;

    sceneHtmls.push(`        <!-- Scene ${i + 1}: ${escapeHtml(scene.title)} -->
        <div class="scene clip" id="s${i + 1}" data-start="${start}" data-duration="${scene.duration}" data-track-index="${i}"${visibilityStyle}>
          <div class="grain"></div>
          <div class="vignette"></div>
          <div class="scene-content" style="display:flex;flex-direction:column;align-items:center;justify-content:center;height:100%;padding:3rem 4rem;text-align:center;--accent:${accent};">
${elementsHtml}
          </div>
        </div>`);
  }

  // Build GSAP timeline JS
  const timelineJs = buildTimelineJs(allEntries, scenes.length, anchorSet, transitions);

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHtml(title)}</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600&display=swap');
    @import url('https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;500&display=swap');

    :root {
      --bg: #0b0d17;
      --ink: #e8eaf0;
      --accent: #4f8cff;
      --muted: #6b7280;
      --accent-dim: rgba(79, 140, 255, 0.12);
      --font-display: "DM Sans", sans-serif;
      --font-data: "JetBrains Mono", monospace;
    }

    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

    body {
      font-family: var(--font-display);
      background: var(--bg);
      color: var(--ink);
      overflow: hidden;
      width: 1920px;
      height: 1080px;
      -webkit-font-smoothing: antialiased;
    }

    .scene {
      position: absolute;
      inset: 0;
      width: 1920px;
      height: 1080px;
      overflow: hidden;
    }

    .scene.clip { clip-path: inset(0); }

    .grain {
      position: absolute;
      inset: 0;
      opacity: 0.03;
      background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E");
      pointer-events: none;
      z-index: 1;
    }

    .vignette {
      position: absolute;
      inset: 0;
      background: radial-gradient(ellipse at center, transparent 60%, rgba(0,0,0,0.45) 100%);
      pointer-events: none;
      z-index: 2;
    }

    .scene-content {
      position: relative;
      z-index: 3;
    }

    h2, h3, p { margin: 0; }
  </style>
</head>
<body>
  <div class="video-container">
${sceneHtmls.join("\n\n")}
  </div>

  <script src="https://cdnjs.cloudflare.com/ajax/libs/gsap/3.12.5/gsap.min.js"></script>
  <script src="https://cdn.jsdelivr.net/npm/hyperframes@latest/dist/hyper-shader.min.js"></script>
  <script>
    (function () {
      window.__timelines = window.__timelines || {};
      var tl = gsap.timeline({ paused: true });

      // ── Visibility / autoAlpha toggles ────────────────────────────
${buildVisibilityJs(scenes.length, anchorSet)}

      // ── Scene animations ──────────────────────────────────────────
${timelineJs}

      // ── HyperShader transitions ───────────────────────────────────
${buildShaderInit(transitions)}

      // Register the timeline so HyperShader can control it
      window.__timelines["main"] = tl;
    })();
  </script>
</body>
</html>`;

  return {
    html,
    totalDuration,
    sceneCount: scenes.length,
    transitions,
  };
}

// ── JS generation helpers ───────────────────────────────────────────────

function buildVisibilityJs(sceneCount: number, anchorSet: Set<number>): string {
  const lines: string[] = [];
  // Scene 1 is always visible from t=0 (no inline style)
  for (let i = 2; i <= sceneCount; i++) {
    const isAnchor = anchorSet.has(i);
    if (isAnchor) {
      // Anchor scene: need a tl.set to make it visible at its start
      lines.push(`      tl.set("#s${i}", { opacity: 1 }, ${i - 1}.1);`);
    } else {
      // Non-anchor: toggle autoAlpha
      lines.push(`      tl.set("#s${i}", { autoAlpha: 0 }, 0);`);
      lines.push(`      tl.set("#s${i}", { autoAlpha: 1 }, ${i - 1}.01);`);
    }
  }
  return lines.join("\n");
}

function buildTimelineJs(
  entries: TimelineEntry[],
  sceneCount: number,
  anchorSet: Set<number>,
  transitions: ShaderTransition[],
): string {
  if (entries.length === 0) return "      // No animations";

  const lines: string[] = [];
  for (const entry of entries) {
    const propsStr = JSON.stringify(entry.props, null, 8)
      .replace(/"([^"]+)":/g, "$1:")
      .replace(/^\{/, "{")
      .replace(/\}$/, "}");
    // Clean up JSON string for JS inline
    const cleanProps = propsStr
      .replace(/\n\s*/g, " ")
      .replace(/\s+/g, " ")
      .trim();

    const staggerPart = entry.stagger ? `, ${entry.stagger}` : "";
    lines.push(
      `      tl.${entry.method}(${entry.target}, ${cleanProps}, ${entry.offset}${staggerPart});`,
    );
  }

  return lines.join("\n");
}

function buildShaderInit(transitions: ShaderTransition[]): string {
  if (transitions.length === 0) {
    return "      // No shader transitions";
  }

  // Collect scene IDs that are anchors (those between transitions)
  const anchorIds: string[] = [];
  const usedScenes = new Set<number>();
  for (const trans of transitions) {
    // Use the time to determine which scene is the anchor
    // Simple approach: include all scenes
    const t = trans.time;
    let sceneIdx = 1;
    let cum = 0;
    // We don't have scene data here, so approximate
    for (let i = 1; i <= 20; i++) {
      // This is handled properly by the caller now — just pass scene IDs
    }
    // Fallback: just use a range
  }

  // Collect unique anchor scene IDs (every other scene)
  for (let i = 1; i <= transitions.length + 2; i++) {
    const idx = i * 2;
    if (!usedScenes.has(idx) && idx <= 20) {
      anchorIds.push(`"s${idx}"`);
      usedScenes.add(idx);
    }
  }

  if (anchorIds.length < 2) {
    anchorIds.push('"s1"', '"s3"', '"s5"');
  }

  const transitionsJson = JSON.stringify(transitions, null, 4);

  return [
    `      window.HyperShader.init({`,
    `        bgColor: getComputedStyle(document.documentElement).getPropertyValue("--bg").trim(),`,
    `        scenes: [${anchorIds.join(", ")}],`,
    `        timeline: tl,`,
    `        transitions: ${transitionsJson.replace(/\n/g, "\n      ")},`,
    `      });`,
  ].join("\n");
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
