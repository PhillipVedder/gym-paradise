export async function normaliseImage(file: File): Promise<Blob> {
  if (file.size > 20_000_000)
    throw new Error('Choose a photo smaller than 20 MB.');
  const url = URL.createObjectURL(file);
  try {
    const image = new Image();
    image.src = url;
    await image.decode();
    const ratio = Math.min(1, 1600 / Math.max(image.width, image.height));
    const canvas = document.createElement('canvas');
    canvas.width = Math.round(image.width * ratio);
    canvas.height = Math.round(image.height * ratio);
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Image processing is unavailable.');
    ctx.fillStyle = '#fff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(image, 0, 0, canvas.width, canvas.height);
    const blob = await new Promise<Blob | null>((r) =>
      canvas.toBlob(r, 'image/jpeg', 0.87),
    );
    if (!blob) throw new Error('Could not prepare this photo.');
    return blob;
  } catch {
    throw new Error(
      'Could not read this image. Try a JPEG, PNG, or a screenshot of the photo.',
    );
  } finally {
    URL.revokeObjectURL(url);
  }
}
export async function uploadImage(blob: Blob) {
  const r = await fetch('/api/media', {
    method: 'POST',
    headers: { 'Content-Type': blob.type },
    body: blob,
  });
  const data = (await r.json()) as { id: string; error?: string };
  if (!r.ok) throw new Error(data.error || 'Photo could not be saved.');
  return data.id as string;
}
export function downloadFile(blob: Blob, name: string) {
  const url = URL.createObjectURL(blob),
    a = document.createElement('a');
  a.href = url;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 30000);
}
