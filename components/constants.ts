// Shared magic numbers for VirusLoader and friends.

/** After skipNext/skipPrev/reloadCurrent runs, repeat calls are dropped for
 *  this long, so double-clicks and held keys act once. */
export const NAVIGATION_LOCK_MS = 300;

/** Random rotation interval bounds in seconds; the max is exclusive. */
export const RANDOMIZATION_MIN_S = 2;
export const RANDOMIZATION_MAX_S = 12;

/** Flash loading animation tick interval. */
export const FLASH_INTERVAL_MS = 100;
/** Delay before clearing the flash animation on stop. */
export const FLASH_STOP_DELAY_MS = 200;
