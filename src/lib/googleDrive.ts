import { getToken, postCloud } from '@/lib/cloudApi';
export function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader(); reader.onload = () => resolve(String(reader.result || '')); reader.onerror = () => reject(new Error('Unable to read the selected image.')); reader.readAsDataURL(blob);
  });
}

export async function uploadStampToGoogleDrive(webAppUrl: string, file: File, existingFileId = '') {
  if (!webAppUrl.trim()) throw new Error('Add the Google Drive Upload URL first.');
  if (!getToken()) throw new Error('Please sign in first.');
  const dataUrl = await blobToDataUrl(file);
  return postCloud<{ fileId: string; folderId: string; url: string }>('uploadStamp', {
    dataUrl,
    fileName: file.name || 'deal-magsil-stamp.png',
    mimeType: file.type || 'image/png',
    existingFileId,
  }, webAppUrl.trim());
}
