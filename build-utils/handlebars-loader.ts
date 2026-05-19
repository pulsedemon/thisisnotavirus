import { readFileSync } from 'fs';
import type { Plugin } from 'vite';

// Shared by vite.config.ts and vitest.config.ts so the two stay in sync.
// Templates are tiny string literals — we wrap them in a function so callers
// get a value identical to handlebars' template signature. The escape step
// neutralizes characters that would otherwise let a template inject script
// markup when interpolated back into HTML, plus U+2028 / U+2029 which
// break JS string literals when emitted as-is.
function escapeUnsafeChars(str: string): string {
  return str.replace(/[<>/\u2028\u2029]/g, ch => {
    const map: Record<string, string> = {
      '<': '\\u003C',
      '>': '\\u003E',
      '/': '\\u002F',
      '\u2028': '\\u2028',
      '\u2029': '\\u2029',
    };
    return map[ch] ?? ch;
  });
}

export function handlebarsLoader(): Plugin {
  return {
    name: 'handlebars-loader',
    transform(_code: string, id: string) {
      if (id.endsWith('.hbs')) {
        const template = readFileSync(id, 'utf-8');
        return {
          code: `export default function() { return ${escapeUnsafeChars(
            JSON.stringify(template)
          )}; }`,
          map: null,
        };
      }
      return null;
    },
  };
}
