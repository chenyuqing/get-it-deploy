/**
 * GET /api/codex/health
 *
 * Lightweight status read for the in-app banner. Returns a simple health
 * status. In cloud deployment, always returns healthy since Codex runs
 * client-side via custom API.
 */

import { NextResponse } from "next/server";

export const runtime = "nodejs";

export async function GET() {
  // In cloud deployment, we don't use local Codex binary
  return NextResponse.json({ ok: true });
}
