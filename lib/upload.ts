/**
 * Direct upload to Uploadthing via their REST API.
 * No SDK dependency — avoids @uploadthing/expo breaking Metro bundler.
 *
 * Flow:
 * 1. POST /api/uploadthing with route slug → get presigned upload URL(s)
 * 2. PUT file directly to presigned URL (S3) → bypasses Vercel body limit
 * 3. Return hosted file URL
 */

const API_URL = process.env.EXPO_PUBLIC_API_URL || 'https://www.xceleraterecruiting.com'

// Token getter — set by the auth provider (same pattern as lib/api.ts)
let getToken: () => Promise<string | null> = async () => null

export function setUploadAuthToken(tokenGetter: () => Promise<string | null>) {
  getToken = tokenGetter
}

interface UploadResult {
  url: string
  name: string
  key: string
}

/**
 * Upload a file to Uploadthing for a given route (e.g. 'filmVideoUpload').
 * Talks directly to the backend's /api/uploadthing endpoint which returns
 * presigned URLs, then uploads the file directly to S3.
 */
export async function uploadFile(
  routeSlug: string,
  fileUri: string,
  fileName: string,
  fileType: string,
  fileSize: number,
  onProgress?: (percent: number) => void,
): Promise<UploadResult> {
  const token = await getToken()
  if (!token) throw new Error('Not authenticated')

  onProgress?.(0)

  // Step 1: Request presigned URLs from our backend
  const presignRes = await fetch(`${API_URL}/api/uploadthing`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
      'x-uploadthing-fe-package': 'uploadthing/client',
      'x-uploadthing-be-adapter': 'nextjs-app',
    },
    body: JSON.stringify({
      files: [{ name: fileName, size: fileSize, type: fileType }],
      routeConfig: routeSlug,
      // Uploadthing v7 uses "actionType" for the request
      actionType: 'upload',
      callbackUrl: `${API_URL}/api/uploadthing`,
      callbackSlug: routeSlug,
      input: {},
    }),
  })

  if (!presignRes.ok) {
    const errText = await presignRes.text()
    throw new Error(`Upload request failed (${presignRes.status}): ${errText}`)
  }

  const presignData = await presignRes.json()

  // The response shape varies by Uploadthing version. Handle both formats.
  const uploadInfo = Array.isArray(presignData) ? presignData[0] : presignData
  const presignedUrl = uploadInfo?.url || uploadInfo?.presignedUrl
  const fileKey = uploadInfo?.key || uploadInfo?.fileKey

  if (!presignedUrl) {
    throw new Error('No presigned URL returned from server')
  }

  onProgress?.(10)

  // Step 2: Read the local file and upload directly to the presigned URL
  const fileResponse = await fetch(fileUri)
  const blob = await fileResponse.blob()

  onProgress?.(20)

  // Upload to presigned URL (direct to S3)
  const uploadRes = await fetch(presignedUrl, {
    method: 'PUT',
    headers: {
      'Content-Type': fileType,
    },
    body: blob,
  })

  if (!uploadRes.ok) {
    const errText = await uploadRes.text()
    throw new Error(`File upload failed (${uploadRes.status}): ${errText}`)
  }

  onProgress?.(90)

  // Step 3: Poll for the file URL (Uploadthing processes after upload)
  // The URL is typically: https://utfs.io/f/{fileKey}
  const fileUrl = `https://utfs.io/f/${fileKey}`

  onProgress?.(100)

  return {
    url: fileUrl,
    name: fileName,
    key: fileKey,
  }
}
