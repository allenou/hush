const rawBase = import.meta.env.BASE_URL;

export const basePath = rawBase.endsWith('/') ? rawBase : `${rawBase}/`;

export function sitePath(path = ''): string {
  return `${basePath}${path.replace(/^\//, '')}`;
}
