export function toFileUrl(filePath: string) {
  const normalized = filePath.replace(/\\/g, '/');
  const encodedPath = normalized
    .split('/')
    .map((segment, index) => index === 0 && /^[a-z]:$/i.test(segment) ? segment : encodeURIComponent(segment))
    .join('/');

  if (/^[a-z]:\//i.test(normalized)) return `file:///${encodedPath}`;
  if (normalized.startsWith('//')) return `file:${encodedPath}`;
  return `file://${encodedPath}`;
}
