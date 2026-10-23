export function appPath(path: string): string {
  const prefix = process.env.NEXT_PUBLIC_BASE_PATH ?? "";
  if (prefix.length === 0) {
    return path;
  }
  if (path === "/") {
    return prefix;
  }
  return `${prefix}${path.startsWith("/") ? path : `/${path}`}`;
}
