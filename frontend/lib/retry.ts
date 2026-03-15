/**
 * Retry a function with exponential backoff.
 * Delays: 500ms, 1s, 2s (3 attempts total).
 */
export async function withRetry<T>(
  fn: () => Promise<T>,
  attempts = 3,
): Promise<T> {
  const delays = [500, 1000, 2000];
  let lastError: unknown;

  for (let i = 0; i < attempts; i++) {
    try {
      return await fn();
    } catch (err) {
      lastError = err;
      if (i < attempts - 1) {
        await new Promise((r) => setTimeout(r, delays[Math.min(i, delays.length - 1)]));
      }
    }
  }

  throw lastError;
}
