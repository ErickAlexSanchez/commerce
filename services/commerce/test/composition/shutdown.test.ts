import { registerShutdown } from "../../src/composition/shutdown";

describe("shutdown", () => {
  test("SIGTERM closes the process once", async () => {
    const handlers = new Map<string, () => void>();
    let closed = 0;
    let code: number | null = null;
    registerShutdown(
      {
        on(event, listener) {
          handlers.set(event, listener);
        },
      },
      async () => {
        closed += 1;
      },
      (exitCode) => {
        code = exitCode;
      },
      () => undefined,
    );
    handlers.get("SIGTERM")?.();
    handlers.get("SIGTERM")?.();
    await new Promise((resolve) => setImmediate(resolve));
    expect(closed).toBe(1);
    expect(code).toBe(0);
  });
});
