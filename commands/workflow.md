---
name: workflow
description: 전체 파이프라인을 한 번에 실행하는 컨덕터 명령어
---

# /workflow — Full Pipeline Conductor

This command runs the complete end-to-end pipeline for a new project (Process 1) by invoking the `conductor` subagent.

## Usage
```
/workflow [project idea or requirements]
```

## Behavior
The `conductor` subagent (defined in `agents/conductor.md`) will:
1. Interview for requirements (if not provided)
2. Run Planner → Architect → Environment → Coder → Tester → Reviewer → Documenter → Releaser
3. Verify each stage's artifacts on disk before proceeding
4. Run final build/test verification
5. Report in Korean: 4-line summary

## When to Use
- "새 프로젝트 전체 다 해줘"
- "아이디어부터 배포까지 한 방에"
- Greenfield projects where you want full automation

## When NOT to Use
- Existing projects (use individual processes via orchestrator)
- Only need one phase (use Tab → orchestrator → pick process)
- Want human checkpoints between stages (use orchestrator instead)