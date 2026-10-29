# F010 슬라이스 6 (3차) 체크리스트 — LLM 가드 · 뉴스 · 검색 (2026-10-06)

| 영역 | REQ | 체크리스트 | 상태 |
|---|---|---|---|
| 서버 | `SRV-REQ-025` FR-61 | `salt-server/requirements/reports/checklists/SRV-REQ-025.md` § F010 슬라이스 6 (3차) | 완료 — `npm test` 575/0 · lint · build · Gemini 실호출 1 |
| DB | `DB-REQ-029` FR-23 | 이 문서 | 로컬 적용 · 스키마 계약 통과 |
| 예측 | `FC-REQ-016` | `salt-forecast/requirements/reports/checklists/FC-REQ-016.md` | FR-1~6 완료 · FR-7 2027-02-08 |
| 예측 | `FC-REQ-017` | `salt-forecast/requirements/reports/checklists/FC-REQ-017.md` | FR-1~6 완료 — `search-interest@1` 근거 없음 · 증분 끔 |
| BFF · 프론트 | — | — | diff 0 |

## 제품 공통 수용 기준 (`pr-convention.md` §6)

1. 3종 고지 — 해설 게이트 무변경(막히면 LLM 을 부르지 않는다)
2. 주문 실행 코드 0 — 추가한 외부 호출은 RSS · Hugging Face · 데이터랩 GET/POST 조회뿐
3. 금액 계산 서버 — 무관
4. 확신 · 목표가 · 명령형 0 — 해설 검증기가 영어 · 판단 극성까지 넓어졌다

## 미검증 · 범위 밖

| 항목 | 사유 | 언제 닫히나 |
|---|---|---|
| 해설 극성 패턴 오탐률(라이브) | 실호출 16회 · 50문장 오탐 0 · 놓침 1 고침 | 라이브 `droppedSentences` 2주(2026-10-20) |
| `news-sentiment@1` 결과 | 라이브 표본 | 2027-02-08 |
| 서버 키워드 감성(±15) 교체 · 제거 | 등록이 정하지 않는다 — 결과 뒤 새 등록 · 사용자 결정 | 2027-02-08 뒤 |

## 2026-10-29 기한 지난 미검증 확인(전수 조사)

| 항목 | 결과 |
|---|---|
| 해설 극성 오탐률 라이브 2주(10-20) | **표본 0 — 측정 불가**: `llm_call_logs` 0행(그 2주 라이브 해설 호출 없음). `droppedSentences` 는 응답에만 실리고 저장되지 않는다 — 측정하려면 기록이 필요. 닫힘 조건을 "실사용 해설 20회 뒤 + `droppedSentences` 기록"으로 바꾼다(`SRV-REQ-025` 범위) |

- 2026-10-29 전수 조사: **done 으로 이동** — 머지 · FR 완료, 남은 항목은 장기 라이브 관찰 · 다른 REQ · QA · 사용자 결정으로 넘긴 것뿐(영역 REQ 체크리스트가 추적)
