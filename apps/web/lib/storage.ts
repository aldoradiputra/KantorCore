import 'server-only'

/**
 * Storage provider abstraction. Today: pass-through to a URL field.
 * Tomorrow: swap in Supabase Storage, S3, GCS, or local FS — only this
 * file changes. Callers receive a stable `{ url, key }` contract.
 *
 * The intentional limitation: we never store binary data in our DB.
 * Even when a provider lands, only the resulting URL + storage key are
 * persisted. This keeps the DB cheap and the provider swap painless.
 */

export interface StoredFile {
  /** Public or signed URL the browser can fetch. */
  url: string
  /** Provider-internal key, useful for delete/replace operations. */
  key: string | null
}

export interface UploadInput {
  tenantId: string
  /** Logical bucket: 'branding-logos' | 'branding-bg' | 'docs' | ... */
  bucket: string
  /** Original filename (used for extension; sanitized internally). */
  filename: string
  /** File contents. */
  data: ArrayBuffer | Uint8Array
  /** MIME type. */
  contentType: string
}

export interface StorageProvider {
  upload(input: UploadInput): Promise<StoredFile>
  delete(key: string): Promise<void>
}

/**
 * Default provider — accepts a pre-supplied URL and stores nothing.
 * Used when the user provides a direct URL (e.g., to a hosted logo)
 * rather than uploading a binary. This unblocks the UI today.
 */
class UrlOnlyProvider implements StorageProvider {
  async upload(_input: UploadInput): Promise<StoredFile> {
    throw new Error(
      'Binary uploads are not yet supported. ' +
      'Provide a URL to a hosted file (Supabase Storage / S3 will be wired in later).',
    )
  }
  async delete(_key: string): Promise<void> {
    // no-op until real provider is wired
  }
}

let provider: StorageProvider = new UrlOnlyProvider()

export function getStorageProvider(): StorageProvider {
  return provider
}

/** Hook for future providers (Supabase, S3, etc.) to register themselves. */
export function setStorageProvider(p: StorageProvider): void {
  provider = p
}
