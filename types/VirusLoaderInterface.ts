export interface VirusLoaderInterface {
  virusLab: unknown;
  loadRandomInterval: ReturnType<typeof setInterval>;
  loadVirus(name: string): void;
  toggleLab(): void;
}
