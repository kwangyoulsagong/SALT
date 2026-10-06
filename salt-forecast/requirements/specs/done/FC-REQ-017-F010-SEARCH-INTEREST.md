---
id: FC-REQ-017
feature: F010
area: forecast
kind: FUNC
title: "F010 슬라이스 6 3차 — 네이버 데이터랩 검색 관심(search-interest@1)"
priority: high
created: 2026-10-06
source: pm/requirements/specs/in-progress/FEATURE-010-judgment-engine-v2.md 기능 요구 7 · 리서치 §7-4 · §7-6 5
---

## Summary

리서치 §7-4: 검색 관심이 늘면 1~2주 뒤 수익이 양(+)(Google Trends), 알트는 관심 급증 뒤 반전 우세 [중]. 국내 개인이 큰 업비트에는
네이버 검색이 가까운 원천이다. 데이터랩 검색어트렌드는 **공식 · 무료(하루 1,000회) · 2016~ 이력** — 뉴스와 달리 백테스트가 된다.

값은 요청 구간 최댓값 = 100 인 **상대 지수**다. 그래서 키워드 하나 = 요청 하나, 백필은 전 기간 한 요청, 증분은 60일을 겹쳐
중앙 비로 이어 붙이고, 신호는 같은 시계열 안의 비율(최근 7일 ÷ 앞 28일)만 쓴다 — 배율이 약분돼 백필 배율의 미래 최댓값이 신호에 들어가지 않는다.

## FR

| FR | 내용 | 상태 |
|---|---|---|
| FR-1 | 사전등록 `search-interest@1` 데이터랩 첫 요청 전 커밋 — H1 BTC 급증 → 7일(양측) · H2 알트 급증 → 7일 BTC 대비(단측 음) · BY-FDR · 최소 104주 | 완료(`3c43b4c`) |
| FR-2 | `ingest/naver_datalab.py` — `POST /v1/datalab/search`, 키는 헤더만(오류 · 로그에 안 실음), 401/403 이면 나머지 종목 중단, 0~100 밖이면 실패. observed = 그날 00:00 KST, available = +48h | 완료(`e34fb68`) — 키 없음 |
| FR-3 | `domain/search_interest.py` — `chain_link`(겹침 28일 미만 · 비 흩어짐 > 25% 면 거부) · `fill_days` · `spike` · `last_known_day` | 완료 |
| FR-4 | `jobs/ingest_search.py` — 처음 보는 종목 백필, 있는 종목 증분, 한 번에 400요청 상한. 키 없으면 건너뜀. `ops/daily.sh` 일일 단계 | 완료 |
| FR-5 | `scoring/search_interest.py` · `jobs/search_interest.py` — 등록 · 실행 · 리포트 | 코드 완료 · **실행 대기(키)** |
| FR-6 | 결과 반영 — 판정만. 근거 있음이면 새 등록, 둘 다 없음이면 증분 수집 끔 | 대기 |

## 등록과 실행이 어긋난 곳

- 등록 [data] 는 `POST /v1/datalab/search`(개발자센터)다. 개발자센터가 2026-07-31 부터 신규 키를 안 내서 NAVER API HUB
  `/search-trend/v1/search` 로 바꿨다 — 같은 데이터랩 검색어트렌드의 이관 호스트이고 본문 · 응답 모양이 같다. 신호 · 지평 · 판정은 그대로

## 하지 않는 것

- 수준 값(오늘 지수)을 신호로 — 요청 배율에 미래가 섞인다
- 여러 키워드를 한 요청에 — 작은 종목이 0 근처로 눌린다
- 결과 뒤 창 · 지평 · 임계 바꿔 재실행
- 상장폐지 종목 수집(사용자 결정 2026-09-29) — 생존 편향은 리포트에

## Changelog

- 2026-10-06: 초판 · FR-1~4 완료 · FR-5 코드 완료(네이버 키 대기)
