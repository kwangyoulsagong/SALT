# 돈 관리 화면 1단계 가계부 — 체크리스트

슬라이스 `requirements/specs/in-progress/MONEY-desktop-household-slice.md`. 항목별 근거는 `salt-microFe/requirements/reports/checklists/FE-REQ-060.md` 1단계 절.

| 항목 | 결과 |
|---|---|
| H1~H7 | 닫힘 |
| 상호작용(사이드 저장 · 날 고르기 · 안 쓴 날 표시 · 키보드) | 충족 |
| 상태(빈 · 실패 · 로그아웃 · 로딩) | 충족 |
| 폭 1920 · 1440 · 1280 · 1024 · 390 앱 UA · 글자 4단 · axe 0 | 충족 |
| 번들(+4 · +28 · +30 kB, 예산 40 안) | 충족 |
| `check-types` · `lint` · `test` · zone 5 빌드 · `build-storybook` · 레이어 훅 · `check-done.mjs` | 통과 |
| 저장 | 충족 | 예산 저장 `PUT` → 저장한 합 950,000 → 980,000원(서버 `total`) · 적기 화면 저장 → 사이드 최근 내역에 바로 |
| 단위 시험 | 9 통과 | `entities/household/lib/board.test.ts` — 날짜 묶음(순서 보존) · 고른 날 판정(주소 날 · 미래 · 다른 달 · 이번 달 오늘) · 변이 셋 전부 잡힘 |
| 같은 글자 두 번 | 고침 | 쓴 곳이 없는 행은 이름이 곧 분류 — 보조 줄 안 그림(행 44) |

## 미검증 · 범위 밖

| 항목 | 사유 | 언제 닫히나 |
|---|---|---|
| 저축 · 팁 · 모바일 배치 | 단계별 PR | 2 · 3 · 4단계 |
| 내 분류 · 근무 시간 입력 크기 · TextArea 11px | 앱 웹뷰와 같이 정할 값 | 4단계 |
