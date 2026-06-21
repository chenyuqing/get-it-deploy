/**
 * Supabase Storage wrapper for file operations.
 *
 * Replaces local filesystem (lib/paths.ts) for cloud deployment.
 * Files are stored in Supabase Storage buckets:
 *   - documents/[userId]/[docId]/source.pdf
 *   - documents/[userId]/[docId]/extracted.json
 *   - etc.
 */

import { createClient } from '@supabase/supabase-js'

if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
  throw new Error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY')
}

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
)

const BUCKET = 'documents'

/**
 * Upload a file to Supabase Storage.
 */
export async function uploadFile(
  userId: string,
  docId: string,
  filename: string,
  data: Buffer | Uint8Array | Blob,
  contentType?: string
): Promise<string> {
  const path = `${userId}/${docId}/${filename}`

  const { data: uploadData, error } = await supabase.storage
    .from(BUCKET)
    .upload(path, data, {
      contentType,
      upsert: true
    })

  if (error) throw error

  // Return the full URL
  const { data: urlData } = supabase.storage
    .from(BUCKET)
    .getPublicUrl(path)

  return urlData.publicUrl
}

/**
 * Download a file from Supabase Storage.
 */
export async function downloadFile(
  userId: string,
  docId: string,
  filename: string
): Promise<Blob> {
  const path = `${userId}/${docId}/${filename}`

  const { data, error } = await supabase.storage
    .from(BUCKET)
    .download(path)

  if (error) throw error
  if (!data) throw new Error('File not found')

  return data
}

/**
 * Check if a file exists.
 */
export async function fileExists(
  userId: string,
  docId: string,
  filename: string
): Promise<boolean> {
  const path = `${userId}/${docId}/${filename}`

  const { data, error } = await supabase.storage
    .from(BUCKET)
    .list(`${userId}/${docId}`, {
      search: filename
    })

  if (error) return false
  return data.length > 0
}

/**
 * Delete a file from Supabase Storage.
 */
export async function deleteFile(
  userId: string,
  docId: string,
  filename: string
): Promise<void> {
  const path = `${userId}/${docId}/${filename}`

  const { error } = await supabase.storage
    .from(BUCKET)
    .remove([path])

  if (error) throw error
}

/**
 * Delete all files for a document.
 */
export async function deleteDocumentFiles(
  userId: string,
  docId: string
): Promise<void> {
  const path = `${userId}/${docId}`

  const { data: files } = await supabase.storage
    .from(BUCKET)
    .list(path)

  if (!files || files.length === 0) return

  const filePaths = files.map(f => `${path}/${f.name}`)

  const { error } = await supabase.storage
    .from(BUCKET)
    .remove(filePaths)

  if (error) throw error
}

/**
 * Upload JSON data as a file.
 */
export async function uploadJson(
  userId: string,
  docId: string,
  filename: string,
  data: unknown
): Promise<string> {
  const json = JSON.stringify(data, null, 2)
  const blob = new Blob([json], { type: 'application/json' })
  return uploadFile(userId, docId, filename, blob, 'application/json')
}

/**
 * Download and parse JSON file.
 */
export async function downloadJson<T = unknown>(
  userId: string,
  docId: string,
  filename: string
): Promise<T> {
  const blob = await downloadFile(userId, docId, filename)
  const text = await blob.text()
  return JSON.parse(text) as T
}
