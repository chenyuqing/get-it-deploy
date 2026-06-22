/**
 * Browser-side localStorage storage layer.
 *
 * In Vercel serverless deployment, all PDF data, extracted text, and metadata
 * are stored in the browser's localStorage instead of server filesystem.
 *
 * Storage schema:
 *   getit:docs           - JSON array of DocMeta (document index)
 *   getit:doc:{id}:meta  - DocMeta for document {id}
 *   getit:doc:{id}:pdf   - Base64-encoded PDF bytes
 *   getit:doc:{id}:extracted - ExtractedPdf data
 */

import type { ExtractedPdf } from './pdf-extract'

export type DocMeta = {
  id: string
  filename: string
  uploadedAt: number
  numPages: number
  lastOpenedAt?: number | null
}

export type StoredDoc = DocMeta & {
  extracted: ExtractedPdf
  pdfUrl: string
}

const STORAGE_PREFIX = 'getit:'
const DOCS_INDEX_KEY = `${STORAGE_PREFIX}docs`

function docMetaKey(docId: string): string {
  return `${STORAGE_PREFIX}doc:${docId}:meta`
}

function docPdfKey(docId: string): string {
  return `${STORAGE_PREFIX}doc:${docId}:pdf`
}

function docExtractedKey(docId: string): string {
  return `${STORAGE_PREFIX}doc:${docId}:extracted`
}

// ── Document Index ──────────────────────────────────────────────────────

function readDocsIndex(): DocMeta[] {
  try {
    const raw = localStorage.getItem(DOCS_INDEX_KEY)
    if (!raw) return []
    return JSON.parse(raw) as DocMeta[]
  } catch {
    return []
  }
}

function writeDocsIndex(docs: DocMeta[]): void {
  localStorage.setItem(DOCS_INDEX_KEY, JSON.stringify(docs))
}

function upsertDocsIndex(meta: DocMeta): void {
  const docs = readDocsIndex()
  const idx = docs.findIndex(d => d.id === meta.id)
  if (idx >= 0) {
    docs[idx] = meta
  } else {
    docs.push(meta)
  }
  writeDocsIndex(docs)
}

function removeFromDocsIndex(docId: string): void {
  const docs = readDocsIndex().filter(d => d.id !== docId)
  writeDocsIndex(docs)
}

// ── Public API ──────────────────────────────────────────────────────────

export function listDocs(): DocMeta[] {
  return readDocsIndex().sort((a, b) => b.uploadedAt - a.uploadedAt)
}

export function saveDoc(doc: StoredDoc, pdfBase64?: string): void {
  const meta: DocMeta = {
    id: doc.id,
    filename: doc.filename,
    uploadedAt: doc.uploadedAt,
    numPages: doc.numPages,
    lastOpenedAt: doc.lastOpenedAt,
  }

  localStorage.setItem(docMetaKey(doc.id), JSON.stringify(meta))
  localStorage.setItem(docExtractedKey(doc.id), JSON.stringify(doc.extracted))

  if (pdfBase64) {
    localStorage.setItem(docPdfKey(doc.id), pdfBase64)
  }

  upsertDocsIndex(meta)
}

export function getDoc(docId: string): StoredDoc | null {
  try {
    const metaRaw = localStorage.getItem(docMetaKey(docId))
    const extractedRaw = localStorage.getItem(docExtractedKey(docId))

    if (!metaRaw || !extractedRaw) return null

    const meta = JSON.parse(metaRaw) as DocMeta
    const extracted = JSON.parse(extractedRaw) as ExtractedPdf

    return {
      ...meta,
      extracted,
      pdfUrl: `/api/pdf/${docId}`,
    }
  } catch {
    return null
  }
}

export function getPdfData(docId: string): string | null {
  return localStorage.getItem(docPdfKey(docId))
}

export function deleteDoc(docId: string): void {
  localStorage.removeItem(docMetaKey(docId))
  localStorage.removeItem(docPdfKey(docId))
  localStorage.removeItem(docExtractedKey(docId))
  removeFromDocsIndex(docId)
}

export function touchDoc(docId: string): DocMeta | null {
  const doc = getDoc(docId)
  if (!doc) return null

  const now = Date.now()
  const updatedMeta: DocMeta = {
    ...doc,
    lastOpenedAt: now,
  }

  localStorage.setItem(docMetaKey(docId), JSON.stringify(updatedMeta))
  upsertDocsIndex(updatedMeta)

  return updatedMeta
}
