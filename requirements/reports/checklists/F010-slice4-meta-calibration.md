# F010 슬라이스 4 — 메타 모델 · 보정 — 체크리스트 (2026-09-29)

영역: `salt-forecast/requirements/reports/checklists/FC-REQ-011.md`

| 확인 | 결과 |
|---|---|
| 사전등록 | `8846a4f`(결과 전) 이후 파일 무변경 · DB `meta-model@1` 1행(재실행 `new: false`) |
| 판정 | **채택 안 함** — AUC 0.652 [0.613, 0.691] 통과 · 규칙만 대비 로그손실 통과 · ECE 0.034 통과 · BSS −0.005 [−0.025, +0.019] 못 넘음 · 셔플 0.609 못 넘음(진단: 누수 아님). 리포트 `salt-forecast/reports/meta-model-meta-model-1-2026-09-29.md` |
| 예측 검증 | ruff · format(144) · pyright 0 · lint-imports 3 kept · pytest 130 passed / 1 skipped(env) · 스키마 계약 1 passed(env 지정) · 누수 17 · 드라이런 as_of 2026-06-30 52초 · 실행 70초 · 538MB |
| 다른 영역 | `salt-server` · `bff` · `salt-microFe` diff 0 — 채택 안 됨 |
| 계약 | 없음(새 표 · 뷰 · 응답 없음) |
| 공통 수용 기준 | 주문 경로 0 · 거래소 키 0 · 새 화면 문장 0 · 확률 미표시 · 3종 게이트 무변화 |

## 미검증 · 범위 밖

| 항목 | 사유 | 언제 닫히나 |
|---|---|---|
| 확률 발행 · 표시 | 채택 안 됨 | `meta-model@2` 채택 시 |
| `meta-model@2` | 결과 전 근거 필요 | 사용자 결정 |
| 라이브 성적 | 원장 8주 | 2026-11-23 |
| 생존 편향 | 원천 없음 | 리서치 §10 슬라이스 7 |
