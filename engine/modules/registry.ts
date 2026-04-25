import type { VirusModule, VirusModuleFactory } from './VirusModule';
import IframeVirusModule from './IframeVirusModule';

/**
 * Module registry: maps a virus id (e.g. `sphere`) to a factory that returns
 * a native VirusModule. Un-registered ids fall back to `IframeVirusModule`,
 * which loads the legacy per-virus HTML page in an iframe.
 *
 * Factories are wrapped in lazy dynamic imports so first-load JS stays small
 * — a virus's code is only fetched the first time it's mounted.
 */
const factories = new Map<string, () => Promise<VirusModuleFactory>>();

export function registerModule(
  id: string,
  loader: () => Promise<{ default: VirusModuleFactory }>
): void {
  factories.set(id, async () => (await loader()).default);
}

export function isRegistered(id: string): boolean {
  return factories.has(id);
}

export function listRegistered(): string[] {
  return Array.from(factories.keys());
}

export async function createModule(id: string): Promise<VirusModule> {
  const factory = factories.get(id);
  if (factory) {
    const make = await factory();
    return make(id);
  }
  return new IframeVirusModule(id, { src: `/viruses/${id}/` });
}

/**
 * Build the module that handles a mixed-virus id (`mixed:N` or
 * `premix:name`). Mixed viruses keep using the iframe shim against
 * `/viruses/lab/?primary=…&secondary=…&ratio=…` for now, since the lab
 * is itself a virus composer that's easier to leave intact in M1.
 */
export function createMixedModule(
  id: string,
  primary: string,
  secondary: string,
  ratio: number
): VirusModule {
  const params = new URLSearchParams({
    primary,
    secondary,
    ratio: String(ratio),
  });
  return new IframeVirusModule(id, {
    src: `/viruses/lab/?${params.toString()}`,
    className: 'virus-iframe iframe-module mixed-virus-iframe',
  });
}

// Native module registrations — pilot ports for Milestone 1.
registerModule('sphere', () => import('../../viruses/sphere/module'));
registerModule(
  'random-shapes',
  () => import('../../viruses/random-shapes/module')
);
registerModule('sky', () => import('../../viruses/sky/module'));
