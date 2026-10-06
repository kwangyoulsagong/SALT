---
id: FC-REQ-016
feature: F010
area: forecast
kind: FUNC
title: "F010 슬라이스 6 3차 — 뉴스 RSS 원장 · 로컬 금융 감성 · 규칙 사건 태그(news-sentiment@1 라이브)"
priority: high
created: 2026-10-06
source: pm/requirements/specs/in-progress/FEATURE-010-judgment-engine-v2.md 기능 요구 7 · 리서치 §2-3 · §2-4 7 · §6-2 · §7-4
---

## Summary

슬라이스 6 다음 묶음 셋(LLM 가드 · 뉴스 구조화 · 데이터랩)을 전부 한다(사용자 결정 2026-10-06). 이 REQ 는 **뉴스 구조화**다.

서버 키워드 감성(`newsSentiment.ts`)은 부정문 · 부분 문자열 · 중복 · 이중 계산 문제가 있고 채점된 적이 없는데 점수 엔진에
±15 로 들어가 있다(리서치 §2-3). 이걸 고치기 전에 **채점할 수 있는 신호를 쌓는다.**

- 감성은 `data-pipeline.md` §5 대로 **로컬 금융 특화 모델**(한국어 KR-FinBert-SC · 영어 FinBERT). 범용 LLM 으로 점수를 내지 않는다
- 모델 입력은 **종목명을 가린 제목**(리서치 §6-2 — 익명화가 원문보다 낫다)
- 시험해 보니 모델이 "거래소 해킹으로 400억 탈취"를 중립으로 읽었다 → **사건 태그(해킹 · 규제 · 상장폐지 …)를 규칙으로 따로**, 부정어(불발 · rejected …) 표시
- 과거 원천이 없다(서버 테이블 6주 · RSS 30건) → 사전등록 `news-sentiment@1` **라이브**(표본 2026-10-07~, 첫 확인 2027-02-08)

## FR

| FR | 내용 | 상태 |
|---|---|---|
| FR-1 | 사전등록 `news-sentiment@1` 채점 표본 전 커밋 — H1 하루 시장 감성 → BTC 다음 날(양측) · H2 악재 사건일 → BTC 다음 날(단측 음) · BY-FDR | 완료(`79e937c`) |
| FR-2 | `forecast.news_item` · `news_score` 불변 테이블(UPDATE 트리거). published_at = observed, **fetched_at = available**(처음 받은 시각, 다시 받아도 유지). 본문 미저장(제목 · 요약 500자). 마이그레이션 `20261006100000_forecast_news`(DB-REQ-029 FR-23) | 완료(`bc70d25`, 로컬 적용) |
| FR-3 | `ingest/rss.py` — 서버 크롤러와 같은 13 피드(Google 뉴스 한국어 검색 10 · coindesk · cointelegraph · cryptoslate) 매시. 미래 pubDate 는 받은 시각으로. 2MB 상한 · 표준 expat | 완료 — 첫 실행 13/13 피드 · 365건 |
| FR-4 | `domain/news_text.py` — URL 정규화 id · 매체 꼬리 뗀 제목 키(중복 묶음) · 한글 비율 언어 판정 · 업비트 한글/영문/티커 별칭(괄호 이름 포함, 일상어 이름 제외) · 가리기 · 사건 태그 7종 + 부정어 | 완료 |
| FR-5 | `models/news_sentiment.py` — safetensors 자동 변환 리비전 · sha256 고정(외부 pickle 안 엶), 라벨 순서 확인, 32건 묶음 CPU. torch 는 `nlp` 의존성 그룹 | 완료 |
| FR-6 | `jobs/news.py` — 수집 · 점수, `--dry-run` · `--no-score` · `--no-fetch`. `ops/daily.sh` 가 20시간 게이트 앞에서 매시(`--group nlp`) | 완료 — 326건 · 연결 117 · 57초(대부분 모델 로드) |
| FR-7 | `news-sentiment@1` 라이브 통계 | 대기 — 2027-02-08 전에는 계산하지 않는다(엿보기 금지) |

## 등록 전 점검에서 고친 것 (2026-10-06, 표본 창 전)

- 상장 태그가 "비상장 주가" · "나스닥 상장사" · "상장 이전"을 잡았다 → 거래소 이름 옆 상장 · 신규 상장 · `lists on <거래소>` 만
- "Safe" · "가스"가 종목으로 이어졌다 → 일상어 이름 표
- 점검용 점수 326행은 지우고 고친 규칙으로 다시 매겼다(사전등록 표본은 10-07 부터라 영향 없음)

## 하지 않는 것

- 감성 점수를 점수 엔진에 바로 넣기 · 서버 키워드 감성 제거 — `news-sentiment@1` 결과를 근거로 새 등록에서
- LLM 으로 감성 · 사건 추출(`ontology.md` §7 · `data-pipeline.md` §5)
- 기사 본문 · 요약을 화면에(피처 · 채점 전용)

## Changelog

- 2026-10-06: 초판 · FR-1~6 완료
