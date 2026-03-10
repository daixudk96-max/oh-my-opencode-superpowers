// TDD-EXEMPT: reason="verifying regex creation bug"
function toPatternRegex(pattern) {
  const escaped = pattern.replace(/[.+^${}()|[\]\\]/g, "\\$&");
  console.log(`Pattern: ${pattern}, Escaped: ${escaped}`);
  const withWildcard = escaped.replace(/\*/g, "[^/]+");
  console.log(`WithWildcard: ${withWildcard}`);
  return new RegExp(`^${withWildcard}$`, "i");
}

const pattern = 'changes/*/tasks.md';
const regex = toPatternRegex(pattern);
const path = 'changes/test/tasks.md';
console.log(`Regex: ${regex}`);
console.log(`Path: ${path}, Test: ${regex.test(path)}`);
