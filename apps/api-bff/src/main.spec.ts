import { existsSync } from 'node:fs';
import { resolve } from 'node:path';

describe('main.ts', () => {
  it('should exist', () => {
    const filePath = resolve(__dirname, 'main.ts');
    expect(existsSync(filePath)).toBe(true);
  });
});
