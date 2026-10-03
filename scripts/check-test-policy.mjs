import { readdirSync, readFileSync } from 'node:fs';
import { join, relative, resolve } from 'node:path';
import ts from 'typescript';

const root = resolve(process.argv[2] ?? 'tests');
const forbidden = new Set(['only', 'skip', 'fixme']);

function* sourceFiles(directory) {
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) yield* sourceFiles(path);
    else if (entry.isFile() && /\.[cm]?[jt]sx?$/.test(entry.name)) yield path;
  }
}

function modifierOf(expression) {
  const names = [];
  while (ts.isPropertyAccessExpression(expression) || ts.isElementAccessExpression(expression)) {
    if (ts.isPropertyAccessExpression(expression)) names.push(expression.name.text);
    else if (ts.isStringLiteral(expression.argumentExpression)) names.push(expression.argumentExpression.text);
    expression = expression.expression;
  }
  return ts.isIdentifier(expression) && expression.text === 'test'
    ? names.find((name) => forbidden.has(name))
    : undefined;
}

let fileCount = 0;
let violations = 0;
for (const path of sourceFiles(root)) {
  fileCount++;
  // Parse calls, not source text: examples in comments and strings are harmless.
  const source = ts.createSourceFile(path, readFileSync(path, 'utf8'), ts.ScriptTarget.Latest, true);
  function visit(node) {
    const modifier = ts.isCallExpression(node) && modifierOf(node.expression);
    if (modifier) {
      const { line, character } = source.getLineAndCharacterOfPosition(node.getStart(source));
      console.error(`${relative(root, path)}:${line + 1}:${character + 1}: Forbidden test modifier: ${modifier}`);
      violations++;
    }
    ts.forEachChild(node, visit);
  }
  visit(source);
}

if (violations || fileCount === 0) {
  if (fileCount === 0) console.error(`No test source files found in ${root}`);
  process.exitCode = 1;
} else {
  console.log(`Test policy passed (${fileCount} files).`);
}
