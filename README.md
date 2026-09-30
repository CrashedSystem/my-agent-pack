# my-agent-pack

A portable set of 16 [opencode](https://opencode.ai) agents: one **orchestrator** router in front, 15 specialists behind it. The agents are plain markdown with YAML frontmatter — no plugin, no npm dependency, no daemon. Installing is a one-shot Node script.

## What It Is

You press <kbd>Tab</kbd>, pick **orchestrator**, and type what you want in plain Korean. Orchestrator shows you a list of **processes** (not agents), you pick a number, and it drives the right specialists in order, verifying each stage's output on disk before moving on.

```
어떤 작업을 하시겠습니까?

  1. 신규 프로젝트 생성    — 아이디어부터 배포까지 전체 파이프라인
  2. 기능 추가/확장       — 기존 코드베이스에 새 기능 이식
  3. 버그 수정/리팩토링   — 문제 분석 → 수정 → 검증
  4. 코드 리뷰/감사       — 스타일, 로직, 보안, 성능 종합 점검 (수정 안 함)
  5. 문서화/배포 설정     — README, API 문서, CI/CD, Dockerfile
  6. 기술 조사/스파이크   — 새 기술 검토, 프로토타입, 결정 문서
  7. 데이터베이스 설계    — ERD, 스키마, 마이그레이션, 쿼리 최적화
  8. API 설계/문서화      — OpenAPI 스펙, 계약 테스트, 클라이언트 생성
  9. 마이그레이션/현대화  — 레거시 → 현대 스택, 점진적 교체
  0. 커스텀 워크플로우    — 직접 단계 지정

1~9 또는 0 중 하나로 답하세요.
```

## One-Shot Full Pipeline

For new projects, use the `/workflow` command (or pick process 1). It runs the complete 8-stage pipeline autonomously:

**Planner → Architect → Environment → Coder → Tester → Reviewer → Documenter → Releaser**

Each stage's artifact is verified on disk before the next runs. Final build/test executed by the conductor itself.

## The Agents

| File | id | Role | Artifact |
|---|---|---|---|
| `orchestrator.md` | `orchestrator` | **Router** — Shows process menu, drives stages, verifies, reports. `mode: all` (visible) |
| `planner.md` | `planner` | Requirements → tech stack, spec, task roadmap | `계획서.md` + `docs/plan/NN-*.md` |
| `architect.md` | `architect` | System design, ADRs, cross-cutting concerns | `아키텍처.md` + `docs/arch/NN-*.md` |
| `environment.md` | `environment` | Project setup, deps, build config, tooling | `환경선언서.md` + configs |
| `coder.md` | `coder` | Application code implementation | Real source files |
| `reviewer.md` | `reviewer` | Blunt code review (style, logic, security, perf) | `리뷰리포트.md` |
| `analyzer.md` | `analyzer` | Bug analysis, perf profiling, security audit | `분석리포트.md` |
| `fixer.md` | `fixer` | Applies prescribed fixes, verifies each | Modified source files |
| `tester.md` | `tester` | Unit/integration/edge/contract tests | `테스트명세서.md` + test files |
| `documenter.md` | `documenter` | README, API docs, ADRs from real code | Docs (verified commands) |
| `releaser.md` | `releaser` | CI/CD, Dockerfile, deploy manifests | Build/deploy configs |
| `researcher.md` | `researcher` | Tech investigation, spikes, decision docs | `조사보고서.md` + `결정문서.md` |
| `migrator.md` | `migrator` | Legacy modernization, incremental migration | `마이그레이션계획서.md` + code |
| `dbdesigner.md` | `dbdesigner` | ERD, schema, migrations, query optimization | `DB설계서.md` + migrations |
| `apidesigner.md` | `apidesigner` | OpenAPI spec, contract tests, client SDKs | `API스펙.yaml` + clients |
| `conductor.md` | `conductor` | Full 8-stage pipeline for `/workflow` | Everything |

**All specialists are `mode: subagent` with `hidden: true`.** They don't appear in Tab cycle or `@` autocomplete. Only `orchestrator` is user-facing (`mode: all`).

## Install

```bash
# Clone or copy this directory
cd my-agent-pack

# Install to opencode config directory (auto-detected)
node scripts/install.mjs

# Or dry-run first
node scripts/install.mjs --dry-run

# Verify
opencode api get /api/agent
```

All 16 ids should be listed, with `orchestrator` visible and the other 15 `hidden`.

### Install Options

| Flag | Effect |
|---|---|
| `--dry-run` | Print plan, change nothing |
| `--force` | Overwrite files that already exist |
| `--check` | Verify agent wiring, install nothing |
| `--list` | Print roster with dispatch ids, modes, visibility |
| `--uninstall` | Remove only files this pack owns |
| `--target <dir>` | Install to custom directory |

The target directory is auto-detected: `$OPENCODE_CONFIG_DIR` → `opencode debug paths config` → `$XDG_CONFIG_HOME/opencode` → `~/.config/opencode`.

## Requirements

- opencode (agents are plain markdown with YAML frontmatter)
- Node 18+ for the installer

## Layout

```
my-agent-pack/
├── agents/          # 16 agent definitions
├── commands/        # /workflow → conductor
├── scripts/         # install.mjs
├── package.json
└── README.md
```

## Design Principles

1. **File-based artifacts** — Every stage writes real files to disk. Next stage reads them. No context loss.
2. **Plan is a document set** — `계획서.md` is a short index (≤150 lines); real spec in `docs/plan/NN-*.md` (≤400 lines each, one concern per file).
3. **Verification is mandatory** — Orchestrator/Conductor runs the actual build/test commands. Never trusts agent's word.
4. **Exclusive ownership** — Only `releaser` touches build config. Only `coder` writes app code. Only `documenter` writes docs from code.
5. **Korean conversation, English artifacts** — Internal processing in English (token efficiency). User-facing output in Korean. Technical docs in English.
6. **No `general` agent** — Every dispatch has a verifiable output contract.

## Uninstall

```bash
node scripts/install.mjs --uninstall
```

Removes only files this pack wrote. Never touches your `opencode.jsonc`, other agents, or anything else.

## License

MIT