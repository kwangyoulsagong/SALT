# FE-REQ-030 (F006 웹 UI) — 검증 체크리스트

- REQ: `requirements/specs/in-progress/FE-REQ-030-F006-UI.md`
- 브랜치: `chore/adr-002-remnants` (`e2f2dfc`) · 검증일: 2026-10-27
- 상태: **FR-3 만 완료** — 나머지(3탭 · 홈 3블록 · 대화 · 포지션 · 알림 · 설정 · 격자)는 F006 착수 때
- **전 영역 통합 기록**: 루트 `requirements/reports/checklists/F000-dormant-410.md`

## 1. FR-3 — `/tax` 진입 링크 0건

| 확인 | 결과 | 근거 |
|---|---|---|
| 화면 코드 `/tax` 링크 | **0건** | `apps/web/src` grep — `app/seo/robots.ts` disallow 한 줄만(링크 아님, 크롤러 차단이라 둔다) |
| 홈 브리핑 | 링크 · 문구 상수 `taxCockpitLink` 삭제 | `widgets/home-briefing` 2파일 |
| 경계 수 | 2 그대로(`FE-REQ-008` FR-26) | 링크는 경계 밖이었다 |
| `apps/web-tax` zone | 그대로 | Q1 · ADR-002 §5 |

## 2. 명령

`apps/web` `tsc --noEmit` · `eslint widgets/home-briefing` · 모노레포 `pnpm check-types` 5/5 · `pnpm lint` 5/5 · `pnpm test` 2/2 ·
`web` · `web-tax` 빌드 · 레이어 훅 사후 실행(파이썬으로 고친 2파일) exit 0.

## 3. 미검증 · 범위 밖

| 항목 | 사유 | 언제 닫히나 |
|---|---|---|
| 홈 화면 실측(링크가 빠진 모습) | 링크 한 줄 제거 · 블록 · 경계 무변경이라 빌드 · 타입으로만 | F006 홈 3블록(이 REQ FR-10) 화면 확인 때 |
| `CrossZoneLink` 소비처 0 | zone 이 둘인 한 남긴다 | zone 존속 결정(Q1) |
| 나머지 FR | F006 | F006 착수 |
