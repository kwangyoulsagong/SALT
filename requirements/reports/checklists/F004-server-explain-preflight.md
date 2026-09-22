# F004 슬라이스 10 — 서버 explain · preflight — 체크리스트

슬라이스: `requirements/specs/in-progress/F004-server-explain-preflight-slice.md` · 2026-09-22
브랜치: `feat/server-f004-followup` (base `main` `5373189`)
영역 체크리스트: `salt-server/requirements/reports/checklists/SRV-REQ-025.md` §6 · `salt-microFe/requirements/reports/checklists/FE-REQ-026.md` · `FE-REQ-028.md` · `bff/requirements/reports/checklists/BFF-REQ-025.md`(변경 0 기록)

## 요약

| 확인 | 결과 |
|---|---|
| explain 인증 | 무토큰 401 · BFF 경유 200 |
| explain 게이트 | 미렌더 시 LLM 0 · 26ms `renderable:false`. 렌더 경로는 단위 테스트 3 |
| preflight | −3% → 110,580,000 · 손실 15,000(정수) · `maxLossOfTotalRate` · `stopPrice` 우선 · 양수 400 |
| 서버 게이트 | build · test 262 · eslint · layer-check |
| 프론트 게이트 | `check-types` · `lint`(monorepo) · `pnpm test` 54(core 11 · ui 43) · web · web-tax 빌드(worktree) · layer-check 사후 5파일 |

## 미검증 · 범위 밖

`SRV-REQ-025.md` §6 미검증과 같다 — LLM 렌더 경로 · abort 실측(로컬 표본 부족), 뉴스 요약 상한 실측, PM 프로토타입.
프론트 `renderable:false` 안내는 화면 실측 안 함(로컬에서 버튼이 안 뜬다).
