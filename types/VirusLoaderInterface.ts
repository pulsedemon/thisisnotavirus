export interface VirusLoaderInterface {
  readonly isLabOpen: boolean;
  loadVirus(name: string): void;
  toggleLab(): void;
  pauseRandomization(): void;
}
