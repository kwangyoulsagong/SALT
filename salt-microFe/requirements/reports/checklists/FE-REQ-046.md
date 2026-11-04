# FE-REQ-046 — 국내 상세 주요 사건 카드 · 국내 탭 다가오는 일정(1단계) 검증 · 2026-11-02

| 항목 | 결과 |
|---|---|
| `pnpm check-types` · `lint` | 통과(5 tasks) |
| `pnpm test` | core 55 · ui 43 — 새 `macroEvents.test.ts`(종류 이름 누락 0 · 카드 · 줄 같은 이름 · 짧은 이름에 지역 말 없음 · 판정 표현 0) |
| `test:layer-check` | 차단 8 · 통과 5 · 바꾼 · 새 파일 훅 사후 실행 exit 0(위반 대조 exit 2) |
| 빌드 | `web` — `/investments` 154 kB · 상세 137 kB(직전 기록과 같음, 새 코드는 지연 조각) · `web-tax` 102 kB |
| 실화면 3000(Playwright 1440) | 소유자 국내 탭: "다가오는 일정 D-1 11.03(화) 소비자물가동향" / 국내 상세 005930: 카드 7건 · 국내 · 미국 표시 · 첫 일정 펼침 · 빗나간 때 3건 · 면책 / 비소유자: 국내 탭 0 · 카드 0 / route 로 일정 0건 · `unavailable` → 줄 0 |
| 실화면에서 고친 것 | "미국미국 고용보고서"(지역 표시 + 이름 겹침 → 짧은 이름) · 일정 줄 명조 글꼴(본문 글꼴 지정) · 날짜 "11. 03. (화)" → "11.03(화)" · 줄 폭(지수 타일과 같은 가득 찬 폭) |
| 레이어 규칙 | 엔티티 `ui/` 새 파일에 상태 훅 없음(`KrScheduleLine` 표시 전용) · `EventsCard` 는 이미 `"use client"` · 페이지 `KrEvents` `"use client"` |

## 미검증 · 범위 밖

| 항목 | 사유 | 언제 닫히나 |
|---|---|---|
| FR-3 예상 창 문구 | 2단계 | `FC-REQ-021` 2단계 |
| 비소유자에게 일정 줄 | 국내 탭이 소유자에게만 보인다(F011 재배포 약관) — 계약은 공개 | 국내 시세 공개 결정 시 |
| ~~위 지수 타일 명조 글꼴~~ | 고침 2026-11-02(사용자 "남은것 ㄱㄱ") — `KrIndexSummary` 띠에 본문 글꼴 지정, 실화면 계산값 `Inter, "Noto Sans KR"` 확인 | 닫힘 |
| 앱(RN) | 모바일 화면 없음 | F007 |

## 국내 탭 요약 띠 (F011, 2026-11-02)

- 변경: FR-5 일정 줄 삭제 · 날짜 포맷 함수 이동(같은 모양 "11.03(화)")
- 검증: `check-types` · `lint` · `test`(core 55 · ui 43) · `test:layer-check` · 훅 사후 실행 exit 0 · `web`(154 · 137 kB) · `web-tax` 빌드 · 실화면 3000 국내 · 코인 탭 — 띠 상자 일정 3행 실화면
- 미검증 · 범위 밖: 없음

## 2026-11-02 — MONEY-F1(`FE-REQ-053`) 투자 zone 분리 · 홈 카드

- MONEY-F1(`FE-REQ-053`) 에서 이 REQ 가 걸렸다 — 투자 화면 `apps/web/src` → `packages/domain-invest/src`(내용 무변경) · 투자 zone 조립(`b00b0cea`). 파일 2개(경로 이동 내용 무변경 2 · 수정 0 · 추가 0 · 삭제 0). 계약 · 동작 무변경
- 확인: 모노레포 check-types · lint · test · zone 5 빌드 · layer-check · 훅 사후 실행(바뀐 TS 전부) · 실화면 — `salt-microFe/requirements/reports/checklists/FE-REQ-053.md` §2

## 2026-11-04 — `DEV-001` 렌더 중 읽기 lint

- `EventsCard` 의 렌더 중 `new Date()` 에 `no-render-read` 예외 주석 — 사건은 소유자 전용 조회라 마운트 뒤 브라우저에서만 온다(서버 렌더에 없음, `DEV-001`)
- 검증: 프론트 전체 `pnpm lint` 12/12 · 규칙 변이(나쁜 6줄 다 걸림 · 처리기 · 효과 · 일반 함수 통과)
