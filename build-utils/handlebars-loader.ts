import { readFileSync } from 'fs';
import type { Plugin } from 'vite';

// a .hbs import becomes a function returning the file's raw text, not a compiled template.
// the escapes keep `</script>` and U+2028/U+2029 from breaking the emitted module; the
// returned string is unchanged.
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
