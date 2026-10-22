const secretKey =
  /authorization|token|secret|signature|email|password|cookie/i;

export type LogValue = string | number | boolean | null;

function redact(fields: Record<string, LogValue>): Record<string, LogValue> {
  const safe: Record<string, LogValue> = {};
  for (const [key, value] of Object.entries(fields)) {
    safe[key] = secretKey.test(key) ? "[redacted]" : value;
  }
  return safe;
}

function write(level: "info" | "error", fields: Record<string, LogValue>): void {
  const line = JSON.stringify({
    level,
    time: new Date().toISOString(),
    ...redact(fields),
  });
  const stream = level === "error" ? process.stderr : process.stdout;
  stream.write(`${line}\n`);
}

export function logInfo(fields: Record<string, LogValue>): void {
  write("info", fields);
}

export function logError(fields: Record<string, LogValue>): void {
  write("error", fields);
}
