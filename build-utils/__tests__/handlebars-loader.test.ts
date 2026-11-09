import { describe, it, expect, afterAll } from 'vitest';
import { mkdtempSync, rmSync, writeFileSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import { handlebarsLoader } from '../handlebars-loader';

type Transform = (code: string, id: string) => { code: string } | null;
const transform = handlebarsLoader().transform as Transform;
const dir = mkdtempSync(join(tmpdir(), 'hbs-'));

afterAll(() => rmSync(dir, { recursive: true }));

describe('handlebarsLoader', () => {
  it('ignores files that are not .hbs', () => {
    expect(transform('', 'a.ts')).toBeNull();
  });

  it('exports the template text unchanged, without a raw </script> or U+2028', () => {
    const source = '<p>a</p></script> b';
    const file = join(dir, 'template.hbs');
    writeFileSync(file, source);

    const { code } = transform('', file)!;
    const literal = /return (".*"); }$/s.exec(code)![1];

    expect(JSON.parse(literal)).toBe(source);
    expect(code).not.toContain('</script>');
    expect(code).not.toContain(' ');
  });
});
