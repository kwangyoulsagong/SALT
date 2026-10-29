# F011 슬라이스 5g 체크리스트 — 국내 전망 국면별 커버리지 (2026-10-26)

색인이다 — 세부는 영역 체크리스트에 있다.

| 항목 | 결과 | 근거 |
|---|---|---|
| `FC-REQ-020` FR-14 | `domain/kr_regime`(경계 결과 전 고정) · `render_regime_coverage` · `kr_backtest` 리포트 절. 챔피언 2026 폭 약 1.5배 · 2026 아래 꼬리 무거운 쪽(신뢰구간 안) · 모델 · 게이트 무변경 | `salt-forecast/requirements/reports/checklists/FC-REQ-020.md` §FR-14 |
| 리포트 | `salt-forecast/reports/kr-backtest-2026-10-26.md`(dry-run 출력, DB 미기록) | — |
| main 대조 | `kr_backtest --dry-run --as-of 2026-10-26` 새 절 앞 462줄 바이트 동일. 공용 함수 변경 없음(함수 추가만) | 같은 체크리스트 |
| 검증 | ruff · format · pyright 0 · lint-imports 3/3 · pytest 318 passed 1 skipped · leakage 35 passed | — |
| 코드가 건드린 기존 REQ | `FC-REQ-020` FR-4(국면 버킷 → FR-14) 상태 문구 · `FC-REQ-009`(`kr_backtest` 주인) Changelog · 체크리스트 · 회고 | 각 REQ |
| FR-8 · `SRV-REQ-040` FR-41 | **보류**(사용자 결정 2026-10-26) — 원천 조사 결과(KRX OPEN API 최선 · 키 필요)와 다시 열 조건을 REQ 에 기록. 코드 변경 없음 | `FC-REQ-020` FR-8 행 |
| 공통 수용 기준(§6) | 주문 경로 0 · 금액 계산 0 · 화면 문구 변경 없음 · 소유자 전용 그대로 | — |
| 계약 | DDL · 뷰 · API · BFF · 프론트 · `.claude/rules` 무변경 | — |

## 미검증 · 범위 밖

| 항목 | 사유 | 언제 닫히나 |
|---|---|---|
| 2026 아래 꼬리 초과가 실제인가 | 국면 안 주 10~42 · 급락이 몇 주에 몰려 ± 가 명목을 덮는다 | 라이브 26주 |
| 국면 조건부 보정 | 근거 없음 — 도전자 사전등록부터(FR-15) | 라이브에서 초과 확인 시 |
| 상 · 하한 마감일 검열 · 시총 버킷 | FR-12 · FR-4 와 같이 미착수 | 형태 재도전 · 시점 시총 원천 시 |
| 백테스트 메모리 2GB 예산 | main 도 2.3GB — 데이터 증가, 이 슬라이스와 무관 | 다음 성능 작업 |
| 실제 실행(DB 쓰기) | 리포트 전용 변경이라 dry-run 만 | 다음 정기 `kr_backtest` |

- 2026-10-29 전수 조사: **done 으로 이동** — 머지 · FR 완료, 남은 항목은 장기 라이브 관찰 · 다른 REQ · QA · 사용자 결정으로 넘긴 것뿐(영역 REQ 체크리스트가 추적)
