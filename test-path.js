// TDD-EXEMPT: reason="Testing path logic on Windows"
import { resolve, relative, isAbsolute } from 'node:path';

function normalizeRelativePath(filePath, workspaceRoot) {
  const resolved = resolve(workspaceRoot, filePath)
  const rel = relative(workspaceRoot, resolved)
  console.log(`resolve(${workspaceRoot}, ${filePath}) -> ${resolved}`);
  console.log(`relative(${workspaceRoot}, ${resolved}) -> ${rel}`);
  if (rel.startsWith("..") || isAbsolute(rel)) {
    return null
  }
  return rel.replace(/\\/g, "/")
}

const root = 'E:\\github\\oh-my-opencode-merge';
const path = 'changes/verify-2/tasks.md';
const normalized = normalizeRelativePath(path, root);
console.log(`Normalized: ${normalized}`);

const root2 = 'E:/github/oh-my-opencode-merge';
const normalized2 = normalizeRelativePath(path, root2);
console.log(`Normalized 2: ${normalized2}`);
