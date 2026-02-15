export type GtagCommand = 'config' | 'event' | 'js' | 'set';

declare function gtag(
  command: GtagCommand,
  targetOrName: string | Date,
  params?: Record<string, unknown>
): void;

/** Safely call gtag — no-ops when blocked by ad blockers. */
export function safeGtag(
  command: GtagCommand,
  targetOrName: string | Date,
  params?: Record<string, unknown>
): void {
  if (typeof gtag === 'function') {
    gtag(command, targetOrName, params);
  }
}
