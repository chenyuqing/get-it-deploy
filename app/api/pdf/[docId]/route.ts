import { NextResponse } from "next/server";
import fs from "node:fs/promises";
import { pdfPath, getDoc } from "@/lib/store";

export const runtime = "nodejs";

export async function GET(
  _req: Request,
  ctx: { params: Promise<{ docId: string }> },
) {
  const { docId } = await ctx.params;

  // In Vercel serverless environment, PDF is stored in browser localStorage
  // Client should POST the PDF data instead of using GET
  if (process.env.VERCEL === '1') {
    return NextResponse.json({
      error: "In serverless mode, use POST to send PDF data from localStorage",
      useLocalStorage: true
    }, { status: 400 });
  }

  const doc = getDoc(docId);
  if (!doc) return NextResponse.json({ error: "not found" }, { status: 404 });
  const buf = await fs.readFile(pdfPath(docId));
  return new NextResponse(buf, {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Length": String(buf.length),
      "Cache-Control": "private, max-age=600",
    },
  });
}

// POST endpoint for serverless environment: client sends base64 PDF data
export async function POST(
  req: Request,
  ctx: { params: Promise<{ docId: string }> },
) {
  const { docId } = await ctx.params;
  const body = await req.json();

  if (!body.pdfData) {
    return NextResponse.json({ error: "pdfData required" }, { status: 400 });
  }

  const buf = Buffer.from(body.pdfData, 'base64');
  return new NextResponse(buf, {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Length": String(buf.length),
      "Cache-Control": "private, max-age=600",
    },
  });
}
