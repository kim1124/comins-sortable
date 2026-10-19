export function disposeOnce(cleanup: () => void): () => void {
  let pending: (() => void) | null = cleanup;
  return () => {
    const current = pending;
    // 재진입과 예외 발생 시에도 완료된 해제 함수가 자원을 계속 보유하지 않는다.
    pending = null;
    current?.();
  };
}

export function runCleanups(cleanups: readonly (() => void)[]): void {
  let failed = false;
  let firstError: unknown;
  for (const cleanup of cleanups) {
    try {
      cleanup();
    } catch (error) {
      if (!failed) firstError = error;
      failed = true;
    }
  }
  if (failed) throw firstError;
}
