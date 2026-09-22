# F004 슬라이스 8 — 프론트 부채 정리 — 체크리스트

슬라이스: `requirements/specs/in-progress/F004-fe-cleanup-slice.md` · 2026-09-22
브랜치: `chore/fe-cleanup-apifetch-candletime` (base `main` `b96faa6`)
영역 체크리스트(본문 · 측정값 전체): `salt-microFe/requirements/reports/checklists/FE-REQ-035.md`

## 요약

| 확인 | 결과 |
|---|---|
| axios import · 의존성 | 0건 · lint 가 막는다(탐침 확인) |
| 요청 모양 | 조회 5종 200 · 별 `POST 201`(JSON) → `DELETE 204` — 전과 같다 |
| 번들 | First Load 변화 0 · axios 든 지연 청크(gzip 21.5 KB) 제거 · 정적 JS 합계 −64 KB |
| 단위 테스트 | `@repo/core` 11(뉴욕 시간대 포함, KST 고정 제거 시 4 실패) · `@repo/ui` 43 |
| 게이트 | `check-types` · `lint`(monorepo) · `pnpm test` · web/web-tax 빌드 · layer-check |

## 미검증 · 범위 밖

영역 체크리스트 `FE-REQ-035.md` §4 와 같다 — 4xx/5xx 화면 동작 실측(에러 모양 소비처 0건), RN 사용, turbo 2.11 동반 갱신(기록만).
