import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import test from 'node:test';

const script = fileURLToPath(new URL('./check-test-policy.mjs', import.meta.url));

function check(t, source) {
  const directory = mkdtempSync(join(tmpdir(), 'darraja-test-policy-'));
  t.after(() => rmSync(directory, { recursive: true, force: true }));
  mkdirSync(join(directory, 'nested'));
  writeFileSync(join(directory, 'nested', 'sample.spec.ts'), source);
  return spawnSync(process.execPath, [script, directory], { encoding: 'utf8', windowsHide: true });
}

for (const modifier of ['only', 'skip', 'fixme']) {
  test(`rejects test.${modifier} and identifies the file and line`, (t) => {
    const result = check(t, `import { test } from '@playwright/test';\ntest.${modifier}('case', () => {});`);
    assert.equal(result.status, 1);
    assert.match(result.stderr, /sample\.spec\.ts:2:/);
    assert.ok(result.stderr.includes(modifier));
  });
}

for (const call of [
  "test.describe.only('suite', () => {});",
  "test.describe.skip('suite', () => {});",
  "test['fixme']('case', () => {});",
  "test \n . /* temporary */ skip \n (true, 'reason');",
  "test('case', () => { test.skip(true, 'reason'); });",
]) {
  test(`rejects modifier call: ${call}`, (t) => {
    const result = check(t, call);
    assert.equal(result.status, 1);
    assert.match(result.stderr, /Forbidden test modifier/);
  });
}

test('accepts normal tests and ignores comments, strings and unrelated objects', (t) => {
  const result = check(t, `
    // test.skip('old example');
    const example = "test.only('not executed')";
    /* test.fixme(true, 'documentation'); */
    other.skip();
    test.describe('suite', () => { test('case', () => {}); });
  `);
  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /Test policy passed/);
});
