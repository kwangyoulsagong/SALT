---
id: SLICE-F010-6C-TEXT-GUARD-SEARCH
title: "F010 슬라이스 6 (3차) — 해설 LLM 가드 · 뉴스 감성 원장(news-sentiment@1 라이브) · 네이버 검색 관심(search-interest@1)"
priority: high
labels: [F010, slice, server, forecast]
created: 2026-10-06
---

## Summary

리서치 §10 슬라이스 6 남은 묶음 셋을 전부 한다(사용자 결정 2026-10-06 — LLM 가드 · 뉴스 구조화 · 데이터랩). 서버(해설 검증) ·
예측(뉴스 · 검색) · DB(뉴스 두 표)가 움직인다. **화면 · BFF 계약은 바뀌지 않는다.**

| 묶음 | 결과 | 제품에 들어간 것 |
|---|---|---|
| LLM 가드 | 리서치 §2-4 8 · 9 | 해설 문장 검증 강화 · 뉴스 블록 격리 · 응답 스키마 — 응답 모양 무변화(`droppedSentences` 만 늘 수 있다) |
| 뉴스 구조화 | 과거 원천 없음 → 라이브 등록 | 매시 RSS 원장 · 로컬 금융 감성 · 사건 태그. 점수 엔진 무변경 — `news-sentiment@1` 첫 확인 2027-02-08 |
| 데이터랩 | 2016~ 이력 → 백테스트 | 수집 · 채점 코드. **네이버 키 대기** — 결과 전 |

| 영역 | REQ | 이 슬라이스 몫 |
|---|---|---|
| 서버 | `salt-server/requirements/specs/in-progress/SRV-REQ-025-F004-API.md` FR-61(신규) | 해설 가드 · 인젝션 방어 |
| DB | `salt-server/requirements/specs/in-progress/DB-REQ-029-F008-SCHEMA.md` FR-23(신규) | `forecast.news_item` · `news_score` |
| 예측 | `salt-forecast/requirements/specs/in-progress/FC-REQ-016-F010-NEWS-SENTIMENT.md`(신규) · `FC-REQ-017-F010-SEARCH-INTEREST.md`(신규) | 뉴스 · 검색 |
| BFF · 프론트 | — | 변경 없음 |

## 커밋 (되돌리기 지점)

| 커밋 | 무엇 | 되돌리려면 |
|---|---|---|
| `2e0d740` feat(server) | 해설 LLM 가드 · 인젝션 방어 | 이 커밋 |
| `79e937c` docs(forecast) | 사전등록 `news-sentiment@1` — 채점 표본 전 | 되돌리지 않는다(증거) |
| `bc70d25` feat(forecast) | 뉴스 RSS 원장 · FinBERT · 사건 태그 · 마이그레이션 | 이 커밋 + `DROP TABLE forecast.news_score, forecast.news_item` |
| `3c43b4c` docs(forecast) | 사전등록 `search-interest@1` — 데이터랩 첫 요청 전 | 되돌리지 않는다(증거) |
| `e34fb68` feat(forecast) | 데이터랩 수집 · 실행 코드 — 결과 전 | 이 커밋. `series_point` 의 `naver_datalab` 행은 source 로 DELETE |

## 판단 — 리뷰가 볼 곳

1. **뉴스 숫자는 뉴스 칸에서만** — 기사 제목의 "20% 급등 전망"이 근거 칸에서 이 종목 사실처럼 통과하던 구멍. 근거 · 판단 칸은 시세 · 근거 사실만 허용
2. **판단 극성 대조는 판단 · 근거 칸만** — 주의 칸은 반대 방향을 말하는 것이 일이다. 첫 판 패턴(가능성이 높/크)이 실호출에서 "반등 가능성을 시사"를 통과시켜 넓혔다 — 오탐률은 미검증
3. **뉴스 감성을 LLM 이 아니라 로컬 FinBERT 로** — `data-pipeline.md` §5. 모델이 암호화폐 악재를 모른다는 것을 확인하고 규칙 사건 태그를 따로 시험한다
4. **forecast 가 RSS 를 직접 받는다** — 서버 크롤러는 서버가 떠 있을 때만 돌아 9/29 뒤로 비어 있었다. 라이브 등록은 빈 날이 생기면 안 된다
5. **available_at = 처음 받은 시각** — RSS 첫 수집에 며칠 묵은 기사가 섞여 온다. 게시 시각으로 자르면 받기 전 기사를 그날 안 것처럼 센다
6. **데이터랩 상대 지수는 비율 신호로만** — 요청 배율이 약분된다. 수준 값은 쓰지 않는다
7. **가중치 해시 고정 · safetensors** — 모델 저장소 기본이 pickle(`.bin`)이라 자동 변환 리비전을 고정했다(라이선스 표기 없음 → 소유자 전용 · 재배포 안 함)
