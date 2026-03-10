// TDD-EXEMPT: reason="Testing regex logic for Bash redirection"
const PLANNING_FILE_NAME_PATTERN = `(?:tasks|plan|plans|task|todo|todos|checklist|implementation|impl|work|workplan|work-plan|roadmap|breakdown|steps)\\.md`
const BASH_FILE_CREATION_PATTERNS = [
  new RegExp(`>\\s*["']?([^"\'\\s|&;]+${PLANNING_FILE_NAME_PATTERN})["']?`, "i"),
  new RegExp(`>>\\s*["']?([^"\'\\s|&;]+${PLANNING_FILE_NAME_PATTERN})["']?`, "i"),
  new RegExp(`\\bcat\\s+.*>\\s*["']?([^"\'\\s|&;]+${PLANNING_FILE_NAME_PATTERN})["']?`, "i"),
  new RegExp(`\\btee\\s+["']?([^"\'\\s|&;]+${PLANNING_FILE_NAME_PATTERN})["']?`, "i"),
  new RegExp(`\\btouch\\s+["']?([^"\'\\s|&;]+${PLANNING_FILE_NAME_PATTERN})["']?`, "i"),
  new RegExp(`\\bcp\\s+.*\\s+["']?([^"\'\\s|&;]+${PLANNING_FILE_NAME_PATTERN})["']?`, "i"),
  new RegExp(`\\bmv\\s+.*\\s+["']?([^"\'\\s|&;]+${PLANNING_FILE_NAME_PATTERN})["']?`, "i"),
];

function extract(command) {
  const paths = [];
  for (const pattern of BASH_FILE_CREATION_PATTERNS) {
    const match = command.match(pattern);
    if (match) {
      console.log(`Matched pattern: ${pattern}`);
      console.log(`Capture group 1: ${match[1]}`);
      paths.push(match[1]);
    }
  }
  return paths;
}

const cmds = [
  'echo "- [ ] test" > changes/verify-2/tasks.md',
  'mkdir -p changes/verify-2 && echo "- [ ] test" > changes/verify-2/tasks.md',
  'cat file > changes/plan.md',
  'touch changes/todo.md'
];

for (const cmd of cmds) {
  console.log(`Command: ${cmd}`);
  console.log(`Paths: ${JSON.stringify(extract(cmd))}`);
  console.log('---');
}
