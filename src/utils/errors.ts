export function safeErrorCode(error: unknown): string {
  if (error && typeof error === 'object' && 'name' in error && typeof error.name === 'string') {
    if (error.name === 'AbortError' || error.name === 'TimeoutError') return 'TIMEOUT';
    if (error.name === 'TypeError') return 'NETWORK_ERROR';
  }
  return 'REQUEST_FAILED';
}

export function skipped(message: string) {
  return { status: 'skipped' as const, message };
}
