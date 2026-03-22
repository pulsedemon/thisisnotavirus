import { VirusMix } from '../types/VirusMix';

const STORAGE_KEY = 'savedVirusMixes';

export function loadSavedMixes(): VirusMix[] {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]') as VirusMix[];
  } catch (error) {
    console.error('Failed to load saved virus mixes:', error);
    return [];
  }
}

export function saveMixes(mixes: VirusMix[]): boolean {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(mixes));
    return true;
  } catch (error) {
    console.error('Failed to save virus mixes:', error);
    return false;
  }
}
