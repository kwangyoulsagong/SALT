# F017 v2 단계 2 점검 — 체크리스트

| 항목 | 상태 | 근거 |
|---|---|---|
| 사전등록이 결과보다 먼저 | 충족 | `81a92d9d` → `2d7b1915` |
| 예측 검증 | 충족 | ruff · format · pyright 0 · lint-imports · pytest 전체 · 누수 · 스키마 대조 |
| 서버 검증 | 충족 | build · lint · test 1200 · layer-check · 훅 사후(음성 대조 exit 2) · migrate diff 0 · 349종목 전수 대조 |
| BFF 검증 | 충족 | build · test 450 · 실호출 |
| FE 검증 | 충족 | check-types · lint · test · layer-check · 운영 빌드(worktree) 첫 로드 = main · 실로그인 실화면 6장면 · axe |
| 미충족 | 기록 | 장중 조건(`@2`) · 사례 줄 · 세그먼트 대비(기존) — 슬라이스 문서 표 |
