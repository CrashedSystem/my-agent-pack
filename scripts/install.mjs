#!/usr/bin/env node
/**
 * my-agent-pack installer
 * Copies agents, commands, and scripts to opencode config directory.
 * Usage: node scripts/install.mjs [options]
 */

import { existsSync, readFileSync, writeFileSync, cpSync, rmSync, mkdirSync } from 'fs';
import { join, dirname, resolve } from 'path';
import { fileURLToPath } from 'url';
import { execSync } from 'child_process';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');
const AGENTS_SRC = join(ROOT, 'agents');
const COMMANDS_SRC = join(ROOT, 'commands');
const SCRIPTS_SRC = join(ROOT, 'scripts');

const AGENT_FILES = [
  'orchestrator.md', 'planner.md', 'architect.md', 'environment.md',
  'coder.md', 'reviewer.md', 'analyzer.md', 'fixer.md', 'tester.md',
  'documenter.md', 'releaser.md', 'researcher.md', 'migrator.md',
  'dbdesigner.md', 'apidesigner.md', 'conductor.md'
];

const COMMAND_FILES = ['workflow.md'];

function getConfigDir(target) {
  if (target) return resolve(target);

  if (process.env.OPENCODE_CONFIG_DIR) return process.env.OPENCODE_CONFIG_DIR;

  try {
    const out = execSync('opencode debug paths config', { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim();
    if (out && existsSync(out)) return out;
  } catch { /* ignore */ }

  const xdg = process.env.XDG_CONFIG_HOME || join(process.env.HOME || '', '.config');
  return join(xdg, 'opencode');
}

function readYamlFrontmatter(filepath) {
  const content = readFileSync(filepath, 'utf8');
  const match = content.match(/^---\n([\s\S]*?)\n---/);
  if (!match) return {};
  const yaml = match[1];
  const obj = {};
  for (const line of yaml.split('\n')) {
    const [key, ...rest] = line.split(':');
    if (key && rest.length) {
      obj[key.trim()] = rest.join(':').trim().replace(/^["']|["']$/g, '');
    }
  }
  return obj;
}

function install(options) {
  const { dryRun, force, check, list, uninstall, target } = options;
  const configDir = getConfigDir(target);
  const agentsDest = join(configDir, 'agents');
  const commandsDest = join(configDir, 'commands');

  console.log(`Config directory: ${configDir}`);
  console.log(`Source: ${ROOT}`);

  if (uninstall) {
    console.log('\n--- Uninstall ---');
    for (const file of AGENT_FILES) {
      const dest = join(agentsDest, file);
      if (existsSync(dest)) {
        if (dryRun) console.log(`Would remove: ${dest}`);
        else { rmSync(dest); console.log(`Removed: ${dest}`); }
      }
    }
    for (const file of COMMAND_FILES) {
      const dest = join(commandsDest, file);
      if (existsSync(dest)) {
        if (dryRun) console.log(`Would remove: ${dest}`);
        else { rmSync(dest); console.log(`Removed: ${dest}`); }
      }
    }
    console.log('Uninstall complete.');
    return;
  }

  if (check) {
    console.log('\n--- Wiring Check ---');
    let broken = [];
    for (const file of AGENT_FILES) {
      const src = join(AGENTS_SRC, file);
      if (!existsSync(src)) {
        broken.push(`Missing source: agents/${file}`);
        continue;
      }
      const fm = readYamlFrontmatter(src);
      // Check subagent_type references in orchestrator and conductor
    }
    // Check orchestrator dispatch table
    const orchestrator = join(AGENTS_SRC, 'orchestrator.md');
    if (existsSync(orchestrator)) {
      const content = readFileSync(orchestrator, 'utf8');
      const tableMatch = content.match(/\|.*subagent_type.*\|([\s\S]*?)\n\|/);
      if (tableMatch) {
        const rows = tableMatch[1].split('\n').filter(r => r.includes('|') && !r.includes('---'));
        for (const row of rows) {
          const cols = row.split('|').map(c => c.trim()).filter(Boolean);
          if (cols.length >= 2) {
            const id = cols[1].replace(/`/g, '');
            if (id && !AGENT_FILES.includes(`${id}.md`)) {
              broken.push(`orchestrator.md dispatches to unknown agent: ${id}`);
            }
          }
        }
      }
    }
    // Check conductor
    const conductor = join(AGENTS_SRC, 'conductor.md');
    if (existsSync(conductor)) {
      const content = readFileSync(conductor, 'utf8');
      const stageMatches = content.matchAll(/Stage \d+: (\w+)/g);
      for (const m of stageMatches) {
        const id = m[1].toLowerCase();
        if (!AGENT_FILES.includes(`${id}.md`) && id !== 'fixer') { // fixer referenced in verification
          broken.push(`conductor.md references unknown agent: ${id}`);
        }
      }
    }

    if (broken.length) {
      console.log('\nBROKEN WIRING — dispatches with no matching agents/<id>.md:');
      for (const b of broken) console.log(`  - ${b}`);
      process.exit(1);
    } else {
      console.log(`wiring ok — ${AGENT_FILES.length} agent ids resolve to agents/*.md`);
    }
    return;
  }

  if (list) {
    console.log('\n--- Agent Roster ---');
    for (const file of AGENT_FILES) {
      const src = join(AGENTS_SRC, file);
      const fm = readYamlFrontmatter(src);
      const id = file.replace('.md', '');
      const mode = fm.mode || 'unknown';
      const hidden = fm.hidden ? ' (hidden)' : '';
      console.log(`  ${id}: mode=${mode}${hidden} — ${fm.description || 'no description'}`);
    }
    console.log('\n--- Commands ---');
    for (const file of COMMAND_FILES) {
      const src = join(COMMANDS_SRC, file);
      const fm = readYamlFrontmatter(src);
      console.log(`  /${file.replace('.md', '')}: ${fm.description || 'no description'}`);
    }
    return;
  }

  console.log('\n--- Install ---');
  if (!dryRun) {
    mkdirSync(agentsDest, { recursive: true });
    mkdirSync(commandsDest, { recursive: true });
  }

  for (const file of AGENT_FILES) {
    const src = join(AGENTS_SRC, file);
    const dest = join(agentsDest, file);
    if (!existsSync(src)) { console.log(`  MISSING: ${file}`); continue; }
    const srcContent = readFileSync(src, 'utf8');
    if (existsSync(dest)) {
      const destContent = readFileSync(dest, 'utf8');
      if (srcContent === destContent) { console.log(`  = identical: ${file}`); continue; }
      if (!force) { console.log(`  ! differs: ${file} (use --force to overwrite)`); continue; }
    }
    if (dryRun) console.log(`  > would write: ${file}`);
    else { writeFileSync(dest, srcContent); console.log(`  > installed: ${file}`); }
  }

  for (const file of COMMAND_FILES) {
    const src = join(COMMANDS_SRC, file);
    const dest = join(commandsDest, file);
    if (!existsSync(src)) { console.log(`  MISSING: ${file}`); continue; }
    const srcContent = readFileSync(src, 'utf8');
    if (existsSync(dest)) {
      const destContent = readFileSync(dest, 'utf8');
      if (srcContent === destContent) { console.log(`  = identical: ${file}`); continue; }
      if (!force) { console.log(`  ! differs: ${file} (use --force to overwrite)`); continue; }
    }
    if (dryRun) console.log(`  > would write: ${file}`);
    else { writeFileSync(dest, srcContent); console.log(`  > installed: ${file}`); }
  }

  console.log('\nInstall complete.');
  console.log('Run `opencode api get /api/agent` to verify registration.');
}

const args = process.argv.slice(2);
const options = {
  dryRun: args.includes('--dry-run'),
  force: args.includes('--force'),
  check: args.includes('--check'),
  list: args.includes('--list'),
  uninstall: args.includes('--uninstall'),
  target: args.find((a, i) => args[i-1] === '--target') || null,
};

install(options);