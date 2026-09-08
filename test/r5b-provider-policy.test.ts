import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { extname, join, resolve } from 'node:path';
import { expect, it } from 'vitest';

function sourceFiles(directory: string): string[] {
  return readdirSync(directory, { withFileTypes: true }).flatMap(entry => {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) return sourceFiles(path);
    return ['.ts', '.tsx'].includes(extname(entry.name)) ? [path] : [];
  });
}

it('ships no password-hash or provider-detection endpoint in the application source', () => {
  expect(existsSync(resolve('lib/server/authProviderMethods.ts'))).toBe(false);
  expect(existsSync(resolve('app/api/auth/providers/route.ts'))).toBe(false);
  const forbiddenFragments = [
    ['password', 'Hash'].join(''),
    ['.list', 'Users('].join(''),
    ['firebaseauth.configs.', 'getHashConfig'].join(''),
  ];
  for (const root of ['app', 'components', 'lib']) {
    for (const file of sourceFiles(resolve(root))) {
      const source = readFileSync(file, 'utf8');
      for (const fragment of forbiddenFragments) expect(source, file).not.toContain(fragment);
    }
  }
});
