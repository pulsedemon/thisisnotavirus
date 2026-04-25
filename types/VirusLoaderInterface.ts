export interface VirusLoaderInterface {
  readonly isLabOpen: boolean;
  loadVirus(name: string): Promise<void> | void;
  toggleLab(): void;
  pauseRandomization(): void;
}

/**
 * Alias retained for new code; the legacy VirusLoaderInterface name is kept
 * so existing UI modules don't need to re-import. Both refer to the same shape.
 */
export type ExperienceControllerInterface = VirusLoaderInterface;
