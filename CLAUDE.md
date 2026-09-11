# 레포지토리 하네스

PM/기능 기획 Claude 규칙은 `pm/CLAUDE.md`에 있다.
프론트엔드 Claude 규칙은 `salt-microFe/CLAUDE.md`에 있다.
BFF Claude 규칙은 `bff/CLAUDE.md`에 있다.
백엔드 Claude 규칙은 `salt-server/CLAUDE.md`에 있다.

PM 작업은 `pm/**`를 작업 범위로 보고, `pm/.claude/rules/`의 관련 규칙을 먼저 읽는다. 기능 기획서는 `salt-microFe/**`, `bff/**`, `salt-server/**` 전체 구현 현황과 계약을 근거로 계속 업데이트한다.

프론트엔드 작업은 `salt-microFe/**`를 작업 범위로 보고, `salt-microFe/.claude/rules/`의 관련 규칙을 먼저 읽는다. `bff/**`, `salt-server/**`는 사용자가 API 계약 변경을 명시하지 않으면 수정하지 않는다.

BFF 작업은 `bff/**`를 작업 범위로 보고, `bff/.claude/rules/`의 관련 규칙을 먼저 읽는다. 프론트엔드 응답 계약이나 백엔드 API 호출 계약 변경이 있으면 `salt-microFe/**`, `salt-server/**` 영향 여부를 함께 확인한다.

백엔드 작업은 사용자가 `salt-server/**` 변경을 명시한 경우에만 수행하고, `salt-server/.claude/rules/`의 관련 규칙을 먼저 읽는다. API 계약 변경이 있으면 `salt-microFe/**` 영향 여부를 함께 확인한다.

글로벌 요구사항/리포트는 루트 `requirements/**`에서 관리한다. 여러 영역을 한 번에 진행하는 작업은 `requirements/specs/in-progress/`의 글로벌 계획을 먼저 확인하고, 각 영역별 세부 요구사항은 `pm/requirements/**`, `salt-microFe/requirements/**`, `bff/requirements/**`, `salt-server/requirements/**`와 동기화한다.

## 레포 공통 규칙과 스킬

영역별 규칙은 각 영역 `.claude/rules/`에 있고, **레포 전체에 걸리는 것만** 루트에 둔다.

| 문서 | 내용 |
|---|---|
| `.claude/rules/pr-convention.md` | PR 본문 규칙. 무엇을·왜 / 리뷰 초점 / **미검증·범위 밖** / 계약 변경 |
| `.github/pull_request_template.md` | GitHub이 새 PR 본문에 자동으로 채운다 |
| `.claude/skills/pr-summary/SKILL.md` | 현재 브랜치의 PR 본문을 템플릿대로 채워 출력한다 (`/pr-summary`) |

영역 규칙은 `.claude/rules/` **한 벌**이다. 2026-09-11에 Codex 하네스(`.codex/**` · `AGENTS.md`)를
제거했다 — 두 벌을 동기화하는 비용만 있고 한쪽만 고쳐지는 사고가 반복됐다.
하네스를 다시 늘리려면 **미러가 아니라 같은 파일을 가리키게** 한다.

## 아키텍처 결정과 전환 (2026-09-09)

되돌리기 비용이 큰 결정은 `requirements/decisions/ADR-*.md`에 기록한다.

| 서피스 | 방법론 | 전환 근거 |
|---|---|---|
| 웹 `salt-microFe/apps/web`, `apps/web-tax` | **FSD** + Next.js **Multi-Zones** + App Router **스트리밍 SSR** | `ADR-001`, `FE-REQ-007`~`009` |
| 모바일 `salt-microFe/apps/mobile` | **FSD** + React Native (iOS+Android) | `RN-REQ-001`~`003` |
| BFF `bff` | 레이어드 + SSE | `BFF-REQ-006` |
| 서버 `salt-server` | **DDD (컨텍스트 우선)** | `SRV-REQ-006` |

- **`@module-federation/nextjs-mf`를 쓰지 않는다.** App Router 미지원 + Next 지원 종료(`ADR-001`).
- 프론트 FSD 슬라이스 이름과 서버 DDD 컨텍스트 이름은 **동일**하다. 레지스트리는 `salt-microFe/.claude/rules/layered-architecture.md` §4.
- 전 영역 요구사항 지도는 `requirements/specs/in-progress/salt-requirements-master-index.md`에 있다.
- **`.claude/rules/**` 문서는 200줄을 넘지 않는다.**
