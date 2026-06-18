/**
 * POST /api/export-video/[docId]
 *
 * Bridges a document's visualizations to HyperFrames scenes and generates
 * a renderable index.html. Supports two modes:
 *
 *   mode=html   → returns the HTML inline + metadata (for preview)
 *   mode=file   → writes index.html to <DATA_DIR>/docs/<docId>/hyperframes/
 *                 and returns the paths. Caller then runs `npx hyperframes render`
 *                 on the output directory.
 *
 * POST body (optional):
 *   { mode?: "html" | "file"; maxCodexCalls?: number; tagIds?: string[] }
 *
 * When `tagIds` is supplied, only those tags are included in the export.
 * When omitted, all tags with completed specs are exported.
 *
 * Response:
 *   { sceneCount, totalDuration, codexCallsUsed, skippedNoSpec,
 *     html? (mode=html), outputDir? (mode=file) }
 */

import { NextResponse } from "next/server";
import fs from "node:fs";
import path from "node:path";
import { getDoc } from "@/lib/store";
import { loadTags } from "@/lib/tags-store";
import { bridgeAllTags, totalDuration } from "@/lib/bridge-viz-to-hyperframes";
import { generateHyperFramesHtml } from "@/lib/hyperframes-html-generator";
import { docDir } from "@/lib/paths";

export const runtime = "nodejs";

export async function POST(
  req: Request,
  ctx: { params: Promise<{ docId: string }> },
) {
  const { docId } = await ctx.params;
  const doc = getDoc(docId);
  if (!doc) {
    return NextResponse.json({ error: "doc not found" }, { status: 404 });
  }

  let body: { mode?: "html" | "file"; maxCodexCalls?: number; tagIds?: string[] } = {};
  try {
    body = await req.json();
  } catch {
    // Use defaults
  }

  const mode = body.mode ?? "html";
  const requestedIds = body.tagIds ?? null;

  // Load tags
  const tagsFile = loadTags(docId);
  let tags = tagsFile?.tags ?? [];

  // Filter by requested tagIds if provided
  if (requestedIds) {
    const idSet = new Set(requestedIds);
    tags = tags.filter((t) => idSet.has(t.id));
    if (tags.length === 0) {
      return NextResponse.json(
        { error: "None of the requested tags were found." },
        { status: 400 },
      );
    }
  }

  if (tags.length === 0) {
    return NextResponse.json(
      { error: "No visualizations found. Run detection first." },
      { status: 400 },
    );
  }

  const readyCount = tags.filter((t) => t.spec != null && t.ready).length;
  if (readyCount === 0) {
    return NextResponse.json(
      { error: "No completed visualizations. Wait for viz generation to finish." },
      { status: 400 },
    );
  }

  // Bridge all tags to HyperFrames scenes
  const bridgeResult = await bridgeAllTags(tags, {
    maxCodexCalls: body.maxCodexCalls ?? 10,
  });

  const { scenes, skippedNoSpec, codexCallsUsed, failedCodexCalls } = bridgeResult;

  if (scenes.length === 0) {
    // Be specific about why — helps the user know what to fix.
    const directReady = tags.filter(
      (t) => t.spec != null && t.ready && t.type !== "3d" && t.type !== "2d-anim",
    ).length;
    const codeReady = tags.filter(
      (t) => t.spec != null && t.ready && (t.type === "3d" || t.type === "2d-anim"),
    ).length;
    const detail = readyCount > 0
      ? `${readyCount} tag(s) have completed specs. ${directReady} direct-mapped (formula/graph/text)${directReady > 0 ? " — these should work without Codex" : ""}, ${codeReady} need Codex bridge${failedCodexCalls > 0 ? ` (${failedCodexCalls} failed)` : ""}. ${codexCallsUsed === 0 && codeReady > 0 ? "All Codex bridge calls failed — check the health banner for account/rate-limit issues." : ""}`
      : `${skippedNoSpec} tag(s) do not have completed specs yet. Wait for viz generation to finish, then retry.`;
    return NextResponse.json(
      { error: `Could not generate any scenes. ${detail}` },
      { status: 500 },
    );
  }

  // Generate HTML
  const docTitle = doc.filename.replace(/\.pdf$/i, "");
  const { html, totalDuration: dur, sceneCount, transitions } =
    generateHyperFramesHtml(scenes, { title: docTitle });

  if (mode === "file") {
    // Write to disk for later rendering
    const outputDir = path.join(docDir(docId), "hyperframes");
    fs.mkdirSync(outputDir, { recursive: true });
    fs.writeFileSync(path.join(outputDir, "index.html"), html, "utf-8");

    // Also write a simple README with render instructions
    const readme = [
      `# ${docTitle} — HyperFrames Video Export`,
      "",
      `- Scenes: ${sceneCount}`,
      `- Total duration: ~${Math.round(dur)}s`,
      `- Shader transitions: ${transitions.length}`,
      `- Codex calls used (bridge agent): ${codexCallsUsed}`,
      "",
      "## Render to MP4",
      "",
      "```bash",
      "cd " + outputDir,
      "npx hyperframes render . -o output.mp4",
      "```",
      "",
      "## Preview",
      "",
      "Open index.html in a browser to preview the animation.",
    ].join("\n");
    fs.writeFileSync(path.join(outputDir, "README.md"), readme, "utf-8");

    return NextResponse.json({
      ok: true,
      sceneCount,
      totalDuration: Math.round(dur),
      codexCallsUsed,
      skippedNoSpec,
      outputDir,
      transitions: transitions.length,
    });
  }

  // mode=html: return inline for preview
  return NextResponse.json({
    sceneCount,
    totalDuration: Math.round(dur),
    codexCallsUsed,
    skippedNoSpec,
    html,
    transitions: transitions.length,
  });
}
