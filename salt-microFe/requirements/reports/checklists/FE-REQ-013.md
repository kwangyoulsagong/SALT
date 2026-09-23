# FE-REQ-013 (F000 PERF) — 검증 체크리스트

- REQ: `salt-microFe/requirements/specs/in-progress/FE-REQ-013-F000-PERF.md`

## 2026-09-23 — 첫 로드 (`next build`, worktree)

| 경로 | 전 | 후 | 이유 |
|---|---|---|---|
| `/coach/report` | 134 kB | **109 kB** | MSW 게이트 · 목 제거 |
| `/investments/[symbol]` | 134 kB | **113 kB** | 목 제거(−24) + SEO 머리 서버 렌더(+3). 중간에 161 kB 회귀 → 머리를 서버 컴포넌트로 · 서버가 배럴을 안 가져오게 고쳐 닫음 |
| `/investments` | — | 140 kB | 변화 없음 |

규칙으로 남김: `performance-frontend.md` §7 — 서버 컴포넌트는 슬라이스 배럴을 값으로 import 하지 않는다.
