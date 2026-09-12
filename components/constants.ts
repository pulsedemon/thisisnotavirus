// Shared magic numbers for VirusLoader and friends.

/** Max time to wait for an iframe load before forcing the loading
 *  animation off and warning Sentry. Sized for crane-game cold WASM. */
export const LOAD_SAFETY_TIMEOUT_MS = 12000;

/** Minimum on-screen time for the loading animation. Prevents
 *  flashes when a virus loads from warm cache. */
export const MIN_LOAD_ANIMATION_MS = 500;

/** Debounce window for skipNext/skipPrev/reload to dampen
 *  double-clicks and rapid key presses. */
export const NAVIGATION_LOCK_MS = 300;

/** Inclusive bounds for the random rotation interval, in seconds. */
export const RANDOMIZATION_MIN_S = 2;
export const RANDOMIZATION_MAX_S = 12;

/** Flash loading animation tick interval. */
export const FLASH_INTERVAL_MS = 100;
/** Delay before clearing the flash animation on stop. */
export const FLASH_STOP_DELAY_MS = 200;
