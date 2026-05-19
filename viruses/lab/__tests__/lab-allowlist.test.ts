import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';
import Playlist from '../../../components/Playlist';

// The lab iframe is a static HTML file with an inline script — it can't
// import Playlist. This test parses the hardcoded ALLOWED_VIRUSES set in
// the inline script and asserts it matches Playlist.viruses, so drift
// between the two surfaces is caught in CI.

const LAB_HTML_PATH = resolve(__dirname, '../index.html');

function extractAllowlist(html: string): string[] {
  const match = html.match(/ALLOWED_VIRUSES\s*=\s*new Set\(\[([\s\S]*?)\]\)/);
  if (!match) throw new Error('ALLOWED_VIRUSES set not found in lab HTML');
  return Array.from(match[1].matchAll(/"([^"]+)"/g)).map(m => m[1]);
}

describe('lab/index.html allowlist', () => {
  it('matches Playlist.viruses', () => {
    const html = readFileSync(LAB_HTML_PATH, 'utf-8');
    const allowed = extractAllowlist(html);
    const expected = new Playlist().viruses;

    expect(allowed.sort()).toEqual([...expected].sort());
  });
});
