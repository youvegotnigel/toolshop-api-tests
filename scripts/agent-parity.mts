/**
 * Keeps Claude Code and GitHub Copilot customisations in step. Runs in CI.
 * - every .claude/agents/<name>.md has .github/agents/<name>.agent.md (and back)
 * - every .claude/commands/<name>.md has .github/prompts/<name>.prompt.md (and back)
 * - every skill folder has a SKILL.md whose `name` matches the folder and has a description
 * - CLAUDE.md imports AGENTS.md and copilot-instructions.md points to it
 */
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';

const problems: string[] = [];
const names = (dir: string, suffix: string): string[] =>
  existsSync(dir)
    ? readdirSync(dir)
        .filter((file) => file.endsWith(suffix))
        .map((file) => file.slice(0, -suffix.length))
    : [];

const pair = (leftDir: string, leftSuffix: string, rightDir: string, rightSuffix: string): void => {
  const left = names(leftDir, leftSuffix);
  const right = names(rightDir, rightSuffix);
  left
    .filter((n) => !right.includes(n))
    .forEach((n) => problems.push(`${rightDir}/${n}${rightSuffix} is missing`));
  right
    .filter((n) => !left.includes(n))
    .forEach((n) => problems.push(`${leftDir}/${n}${leftSuffix} is missing`));
};

pair('.claude/agents', '.md', '.github/agents', '.agent.md');
pair('.claude/commands', '.md', '.github/prompts', '.prompt.md');

const skillsDir = '.claude/skills';
for (const skill of existsSync(skillsDir) ? readdirSync(skillsDir) : []) {
  const file = path.join(skillsDir, skill, 'SKILL.md');
  if (!existsSync(file)) {
    problems.push(`${file} is missing`);
    continue;
  }
  const text = readFileSync(file, 'utf8');
  if (!new RegExp(`^name: ${skill}$`, 'm').test(text)) problems.push(`${file}: name must be "${skill}"`);
  if (!/^description: "?.{20,}$/m.test(text))
    problems.push(`${file}: add a description of at least 20 characters`);
}

if (!readFileSync('CLAUDE.md', 'utf8').includes('@AGENTS.md'))
  problems.push('CLAUDE.md must import @AGENTS.md');
if (!readFileSync('.github/copilot-instructions.md', 'utf8').includes('AGENTS.md')) {
  problems.push('.github/copilot-instructions.md must point to AGENTS.md');
}

if (problems.length > 0) {
  console.error(`Agent parity check failed:\n- ${problems.join('\n- ')}`);
  process.exitCode = 1;
} else {
  console.log('Agent parity OK: Claude Code and Copilot customisations match');
}
