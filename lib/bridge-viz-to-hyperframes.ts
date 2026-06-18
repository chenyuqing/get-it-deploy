/**
 * Bridge: VizSpec → HyperFrames scene descriptions.
 *
 * Two paths:
 *   Direct mapping (zero LLM cost):
 *     formula → formula-reveal scenes
 *     graph   → chart-animation scenes
 *     2d-text → title-card + text-reveal scenes
 *
 *   LLM bridge agent (one Codex call per concept):
 *     3d      → label + context → 2D concept illustration scene
 *     2d-anim → label + context → 2D process diagram scene
 *
 * Callers should prefer `bridgeAll` which reads a full tags file and returns
 * scenes for every tag that has a completed `spec`.
 */

import { runJson } from "./codex";
import type {
  VizSpec,
  VizType,
  FormulaSpec,
  GraphSpec,
  TwoDTextSpec,
  ThreeDSpec,
  TwoDAnimSpec,
} from "./schemas";
import { VIZ_TYPES } from "./schemas";
import type { PersistedTagServer } from "./tags-store";

// ── HyperFrames scene types ─────────────────────────────────────────────

export type HyperFramesElement =
  | { kind: "title"; text: string; subtitle?: string }
  | { kind: "formula"; latex: string; note?: string }
  | { kind: "text"; body: string }
  | { kind: "citation"; label: string; source: string }
  | { kind: "bar"; bars: Array<{ label: string; value: number; color: string }> }
  | { kind: "line"; series: Array<{ name: string; color: string; points: Array<[number, number]> }> }
  | { kind: "points"; points: Array<[number, number]>; xLabel?: string; yLabel?: string }
  | { kind: "function"; expression: string; xMin: number; xMax: number }
  | { kind: "concept_card"; concept: string; description: string; icon_hint?: string };

export type HyperFramesScene = {
  /** Display title for the scene (shown in scene list UI). */
  title: string;
  /** Duration in seconds. */
  duration: number;
  /** The content elements to render. */
  elements: HyperFramesElement[];
  /** Optional animation hint: "stagger_reveal" | "draw_path" | "scale_up" | "fade_in". */
  animation: "stagger_reveal" | "draw_path" | "scale_up" | "fade_in";
  /** Scene entry tween. */
  entrance: "slide_up" | "scale_in" | "fade_only";
};

// ── Direct mappings (zero LLM cost) ────────────────────────────────────

const CHART_COLORS = ["#4f8cff", "#e11d48", "#059669", "#d97706", "#7c3aed", "#0284c7"];

function bridgeFormula(spec: FormulaSpec): HyperFramesScene[] {
  const scenes: HyperFramesScene[] = [];

  // Scene 1: main formula reveal
  scenes.push({
    title: spec.title,
    duration: 3,
    elements: [{ kind: "title", text: spec.title, subtitle: spec.caption }],
    animation: "fade_in",
    entrance: "slide_up",
  });

  scenes.push({
    title: `${spec.title} — formula`,
    duration: 3.5,
    elements: [{ kind: "formula", latex: spec.main_latex }],
    animation: "scale_up",
    entrance: "fade_only",
  });

  // Scenes 3+: one per derivation step
  for (let i = 0; i < spec.steps.length; i++) {
    const step = spec.steps[i]!;
    scenes.push({
      title: `${spec.title} — step ${i + 1}`,
      duration: 3,
      elements: [
        { kind: "formula", latex: step.latex },
        { kind: "text", body: step.explanation },
      ],
      animation: "stagger_reveal",
      entrance: "slide_up",
    });
  }

  return scenes;
}

function bridgeGraph(spec: GraphSpec): HyperFramesScene[] {
  const scenes: HyperFramesScene[] = [];

  // Title scene
  scenes.push({
    title: spec.title,
    duration: 2.5,
    elements: [{ kind: "title", text: spec.title, subtitle: spec.caption }],
    animation: "fade_in",
    entrance: "slide_up",
  });

  // Chart scene
  let dataJson: unknown;
  try {
    dataJson = JSON.parse(spec.data_json);
  } catch {
    dataJson = {};
  }

  const data = dataJson as Record<string, unknown>;

  switch (spec.chart_type) {
    case "bars": {
      const bars = (data.bars as Array<{ label: string; value: number }>) ?? [];
      scenes.push({
        title: `${spec.title} — chart`,
        duration: 4,
        elements: [
          {
            kind: "bar",
            bars: bars.map((b, i) => ({
              label: b.label,
              value: b.value,
              color: CHART_COLORS[i % CHART_COLORS.length]!,
            })),
          },
        ],
        animation: "stagger_reveal",
        entrance: "scale_in",
      });
      break;
    }
    case "lines": {
      const series = (data.series as Array<{
        name: string;
        color: string;
        points: Array<[number, number]>;
      }>) ?? [];
      scenes.push({
        title: `${spec.title} — chart`,
        duration: 4,
        elements: [{ kind: "line", series }],
        animation: "draw_path",
        entrance: "scale_in",
      });
      break;
    }
    case "points": {
      const points = (data.points as Array<[number, number]>) ?? [];
      scenes.push({
        title: `${spec.title} — chart`,
        duration: 4,
        elements: [{ kind: "points", points, xLabel: spec.x_label, yLabel: spec.y_label }],
        animation: "stagger_reveal",
        entrance: "scale_in",
      });
      break;
    }
    case "function": {
      const fn = (data.fn as string) ?? "x";
      const xMin = (data.x_min as number) ?? -5;
      const xMax = (data.x_max as number) ?? 5;
      scenes.push({
        title: `${spec.title} — chart`,
        duration: 4,
        elements: [{ kind: "function", expression: fn, xMin, xMax }],
        animation: "draw_path",
        entrance: "scale_in",
      });
      break;
    }
  }

  return scenes;
}

function bridgeTwoDText(spec: TwoDTextSpec): HyperFramesScene[] {
  const scenes: HyperFramesScene[] = [];

  // Title card
  scenes.push({
    title: spec.title,
    duration: 2.5,
    elements: [{ kind: "title", text: spec.title, subtitle: spec.caption }],
    animation: "fade_in",
    entrance: "slide_up",
  });

  // Body text (split into ~2 scenes if needed)
  const body = spec.body_markdown;
  const paragraphs = body.split(/\n\n+/).filter(Boolean);
  const perScene = Math.max(1, Math.ceil(paragraphs.length / 2));

  for (let i = 0; i < paragraphs.length; i += perScene) {
    const chunk = paragraphs.slice(i, i + perScene).join("\n\n");
    scenes.push({
      title: `${spec.title} — ${i === 0 ? "body" : `continued`}`,
      duration: Math.min(5, 2 + chunk.length * 0.004),
      elements: [{ kind: "text", body: chunk }],
      animation: "fade_in",
      entrance: "slide_up",
    });
  }

  // Citations
  if (spec.citations.length > 0) {
    scenes.push({
      title: `${spec.title} — sources`,
      duration: Math.min(6, 1.5 + spec.citations.length * 1.5),
      elements: spec.citations.map((c) => ({
        kind: "citation" as const,
        label: c.label,
        source: c.source,
      })),
      animation: "stagger_reveal",
      entrance: "slide_up",
    });
  }

  return scenes;
}

// ── LLM bridge agent for code-emitting types (3d, 2d-anim) ─────────────

const BRIDGE_SYSTEM = `You are the bridge between Get It.'s visualizer and HyperFrames video generation.

You receive a concept that was rendered as a 3D model or 2D Canvas animation
in the interactive viewer. The concept CANNOT be rendered as-is in a video
(Three.js and Canvas2D don't exist in HyperFrames). Your job: describe how this
concept should appear as a 2D scene in a HyperFrames video.

For each concept, produce 1–2 scenes. Each scene must have:
  - A short title (≤50 chars)
  - 1–2 elements that represent the concept in 2D form
  - A recommended animation style

Choose elements thoughtfully:
  - "concept_card" — a labeled illustration of the concept (ideal for 3D objects)
  - "title" — a text title card with subtitle
  - "text" — body text explanation
  - "formula" — a LaTeX formula if math is involved
  - "bar" / "line" / "points" — charts if data is relevant

ANIMATION GUIDE:
  - "stagger_reveal" — multiple items appear in sequence
  - "draw_path" — lines/curves are traced into existence (for processes, flows)
  - "scale_up" — a single element grows from nothing (for emphasis)
  - "fade_in" — gentle opacity transition (for text, cards)

ENTRANCE GUIDE:
  - "slide_up" — content slides up from below
  - "scale_in" — content scales in from a point
  - "fade_only" — pure opacity transition

Reply with JSON only, matching the schema.`;

const BRIDGE_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["scenes"],
  properties: {
    scenes: {
      type: "array",
      minItems: 1,
      maxItems: 2,
      items: {
        type: "object",
        additionalProperties: false,
        required: ["title", "duration", "elements", "animation", "entrance"],
        properties: {
          title: { type: "string", minLength: 2, maxLength: 80 },
          duration: { type: "number", minimum: 2, maximum: 6 },
          animation: {
            type: "string",
            enum: ["stagger_reveal", "draw_path", "scale_up", "fade_in"],
          },
          entrance: {
            type: "string",
            enum: ["slide_up", "scale_in", "fade_only"],
          },
          elements: {
            type: "array",
            minItems: 1,
            maxItems: 3,
            items: {
              type: "object",
              additionalProperties: false,
              required: ["kind"],
              properties: {
                kind: {
                  type: "string",
                  enum: ["title", "formula", "text", "concept_card", "bar", "line", "points"],
                },
                // Shared fields
                text: { type: "string", maxLength: 400 },
                subtitle: { type: "string", maxLength: 200 },
                body: { type: "string", maxLength: 1000 },
                latex: { type: "string", maxLength: 400 },
                note: { type: "string", maxLength: 200 },
                // concept_card
                concept: { type: "string", maxLength: 100 },
                description: { type: "string", maxLength: 400 },
                icon_hint: { type: "string", maxLength: 60 },
                // bar
                bars: {
                  type: "array",
                  maxItems: 8,
                  items: {
                    type: "object",
                    additionalProperties: false,
                    required: ["label", "value", "color"],
                    properties: {
                      label: { type: "string", maxLength: 40 },
                      value: { type: "number" },
                      color: { type: "string", maxLength: 10 },
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
  },
} as const;

async function bridgeCodeType(
  vizType: VizType,
  label: string,
  context: string,
  signal?: AbortSignal,
): Promise<HyperFramesScene[]> {
  const typeLabel = vizType === "3d" ? "3D scene" : "2D Canvas animation";
  const prompt = `${BRIDGE_SYSTEM}

CONCEPT TYPE: ${typeLabel}
CONCEPT NAME: ${label}
ORIGINAL CONTEXT: ${context}

INSTRUCTION: This concept was originally rendered as a ${typeLabel} in an
interactive viewer. Produce 1–2 scenes that explain it in a flat 2D video
format. If the concept involves a 3D object (molecule, organ, structure),
describe it as a concept_card with key features. If it's a process or
simulation, use a draw_path animation to trace the flow.

Reply with JSON only.`;

  const { data } = await runJson<{ scenes: HyperFramesScene[] }>(
    prompt,
    BRIDGE_SCHEMA,
    { reasoning: "low", signal },
  );
  return data.scenes;
}

// ── Public API ──────────────────────────────────────────────────────────

/**
 * Bridge a single VizSpec to HyperFrames scenes.
 *
 * For formula/graph/2d-text this is zero-cost (programmatic mapping).
 * For 3d/2d-anim this makes one Codex call.
 */
export async function bridgeSpecToScenes(
  spec: VizSpec,
  opts?: { signal?: AbortSignal },
): Promise<HyperFramesScene[]> {
  // Defensive: LLM-generated specs may occasionally miss the `type`
  // discriminator. Treat unknown types as a no-op so the video export
  // gracefully skips them instead of crashing.
  switch (spec.type) {
    case "formula":
      return bridgeFormula(spec);
    case "graph":
      return bridgeGraph(spec);
    case "2d-text":
      return bridgeTwoDText(spec);
    case "3d":
    case "2d-anim":
      // Use the concept label + context from the spec's own metadata
      // (title + caption serve as label + context for the bridge agent).
      return bridgeCodeType(spec.type, spec.title, spec.caption, opts?.signal);
    default:
      console.warn(`[bridge] skipping viz spec with unknown type: ${String((spec as { type?: unknown }).type)}`);
      return [];
  }
}

/**
 * Bridge all completed tags in a persisted tags file to HyperFrames scenes.
 * Only tags with a `spec` (ready) are included.
 *
 * Processes non-Codex tags (formula, graph, 2d-text) FIRST — these are
 * fast, zero-cost direct mappings. Then attempts LLM bridge calls for
 * 3d/2d-anim tags up to `maxCodexCalls`. This way, even if every Codex
 * call fails (no auth, rate-limited, binary missing), the export still
 * produces useful scenes from the direct-mapped tags.
 *
 * Returns scenes in document order (by page, then position).
 */
export async function bridgeAllTags(
  tags: PersistedTagServer[],
  opts?: {
    signal?: AbortSignal;
    /** Tags that need LLM bridge calls (3d / 2d-anim). Default: all tags with spec. */
    maxCodexCalls?: number;
  },
): Promise<{
  scenes: HyperFramesScene[];
  skippedNoSpec: number;
  codexCallsUsed: number;
  failedCodexCalls: number;
}> {
  const readyTags = tags.filter((t) => t.spec != null && t.ready);
  const validTags = readyTags.filter(
    (t) => t.spec!.type && VIZ_TYPES.includes(t.spec!.type as VizType),
  );
  const skippedCount = readyTags.length - validTags.length;

  // Separate into two groups: direct-mapped (zero LLM cost) vs bridge (needs Codex).
  const directTags = validTags.filter(
    (t) => t.spec!.type !== "3d" && t.spec!.type !== "2d-anim",
  );
  const codeTags = validTags.filter(
    (t) => t.spec!.type === "3d" || t.spec!.type === "2d-anim",
  );

  const scenes: HyperFramesScene[] = [];

  // ── Pass 1: direct mapping (fast, zero-token) ─────────────────────
  for (const tag of directTags) {
    try {
      scenes.push(...(await bridgeSpecToScenes(tag.spec!, opts)));
    } catch (err) {
      console.warn(
        `[bridge] direct mapping failed for tag ${tag.id} (${tag.spec!.type}):`,
        err instanceof Error ? err.message : err,
      );
    }
  }

  // ── Pass 2: LLM bridge calls (slow, costs tokens) ─────────────────
  let codexCallsUsed = 0;
  let failedCodexCalls = 0;

  for (const tag of codeTags) {
    if (opts?.maxCodexCalls != null && codexCallsUsed >= opts.maxCodexCalls) {
      break;
    }
    try {
      const result = await bridgeCodeType(
        tag.spec!.type,
        tag.label,
        tag.concept.context,
        opts?.signal,
      );
      scenes.push(...result);
      codexCallsUsed++;
    } catch (err) {
      console.warn(
        `[bridge] LLM bridge failed for tag ${tag.id} (${tag.spec!.type}):`,
        err instanceof Error ? err.message : err,
      );
      failedCodexCalls++;
    }
  }

  return {
    scenes,
    skippedNoSpec: skippedCount + tags.filter((t) => !t.spec || !t.ready).length,
    codexCallsUsed,
    failedCodexCalls,
  };
}

/**
 * Estimate total duration from scenes. Used for HyperFrames skeleton selection.
 */
export function totalDuration(scenes: HyperFramesScene[]): number {
  return scenes.reduce((sum, s) => sum + s.duration, 0);
}
