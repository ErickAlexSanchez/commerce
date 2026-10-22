export type ShutdownEvents = {
  on(event: string, listener: () => void): void;
};

export function registerShutdown(
  events: ShutdownEvents,
  close: () => Promise<void>,
  exit: (code: number) => void,
  log: (message: string) => void,
): void {
  let started = false;
  const stop = (signal: string) => {
    if (started) {
      return;
    }
    started = true;
    log(signal);
    close()
      .then(() => {
        exit(0);
      })
      .catch((error: unknown) => {
        const message = error instanceof Error ? error.message : "shutdown failed";
        log(message);
        exit(1);
      });
  };
  events.on("SIGTERM", () => {
    stop("SIGTERM");
  });
  events.on("SIGINT", () => {
    stop("SIGINT");
  });
}
