# F017 v2 단계 2 점검 — 체크리스트

| 항목 | 상태 | 근거 |
|---|---|---|
| 사전등록이 결과보다 먼저 | 충족 | `81a92d9d` → `2d7b1915` |
| 예측 검증 | 충족 | ruff · format · pyright 0 · lint-imports · pytest 전체 · 누수 · 스키마 대조 |
| 서버 검증 | 충족 | build · lint · test 1200 · layer-check · 훅 사후(음성 대조 exit 2) · migrate diff 0 · 349종목 전수 대조 |
| BFF 검증 | 충족 | build · test 450 · 실호출 |
| FE 검증 | 충족 | check-types · lint · test · layer-check · 운영 빌드(worktree) 첫 로드 = main · 실로그인 실화면 6장면 · axe |
| 미충족 | 기록 | 장중 조건(`@2`) · 사례 줄 · 세그먼트 대비(기존) — 슬라이스 문서 표 |

## 확인 2회차 (2026-11-11, 사용자 "파이프라인 검증 및 버그 검증 다했지" — 아니었다)

| 항목 | 상태 | 근거 |
|---|---|---|
| 공용 함수 소비처 main 과 나란히 | 충족 | `Panel.open` · `session_panel` — `rule_ic_kr` · `rule_ic` 1차 결과를 main worktree 와 바이트 대조(같음) |
| FE 영역 전체 타입 | 충족 | `pnpm check-types` 13/13 |
| 입력 칸 뜻 | 충족 | 국내 `tradeValue` = `acml_tr_pbmn`(오늘 누적 거래대금) · `openPrice` = `stck_oprc` — 오늘 일봉 시가와 50/51 같음, 1건(010950) 비어 있음 = 장중 상위 50 밖으로 밀려난 종목(시총 52위, 설계대로) — 비면 K3 성립 아님 |
| 시험 데이터 | 정리 | 전수 대조 · 화면 확인이 만든 점검 원장 355줄 삭제(채점 0건이라 결과 표 영향 없음) |
| 로딩 · 실패 화면 | 충족 | 둘 다 132px(같은 높이) · 실패는 한 줄 · 판단 · 차트 안 막음 |
