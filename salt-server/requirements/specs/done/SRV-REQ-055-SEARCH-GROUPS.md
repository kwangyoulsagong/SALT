---
id: SRV-REQ-055
feature: F000
area: backend
kind: API
title: "검색 모달 2단계 — 업종 · 지수 · 뉴스 결과 묶음 · 지금 뜨는 업종 · 곁 칸(같은 업종 · 함께 태그)"
priority: medium
created: 2026-11-10
source: "`FE-REQ-066` FR-8(사용자 결정 D4 2026-11-09 — 2단계 포함) · 곁 칸 · 업종 이동 결정(사용자 2026-11-10)"
---

## Summary

> **done 2026-11-10** — `dd0bbdcc`(경로 셋) · `0df7784e`(실호출에서 본 제목 깨짐 — 주인 `SRV-REQ-051`). 검증 `reports/checklists/SRV-REQ-055.md`

검색 모달(`FE-REQ-066`)의 2단계 서버 짝. **원천은 전부 이미 모으는 것이다** — 업종 지수(`kr_sector_index_quote` · `kr_index_name`, `DB-REQ-041`) ·
국내 시황 제목(`kr_news_title`) · 코인 기사 태그(`news_articles.symbols`) · 시장 지수(`kr_index_quotes`). DDL 0.

착수 전 네 질문(`msa-services.md` §1): ① 서비스 `market`(Express `market` · `news` 컨텍스트) ② S5 전 — Express ③ 읽는 표 전부 `market` · `news` 주인, 쓰기 0 ·
교차 스키마 조인 0 ④ BFF 계약 새 경로 셋(`BFF-REQ-054`). 투자는 동결이지만 이 REQ 는 기획된 2단계(D4)다.

**원천 사실 하나가 계획을 바꿨다(2026-11-10 실측)** — 국내 시황 제목은 제목 하나에 종목 하나만 붙어 온다(3,059건 중 함께 언급 0, 같은 제목이 여러 종목에
있는 건 자동 시황 목록 45건뿐). "뉴스에서 언급된 관련주"를 국내에서 만들 수 없어 곁 칸을 **같은 업종**(국내) · **같은 기사에 함께 태그**(코인)로 정했다(사용자).

## FR

| FR | 내용 | 상태 |
|---|---|---|
| FR-1 | **결과 묶음** `GET /api/investment/search/groups?q=`(로그인) → `{ sectors, indices, news }`. 업종 = 이름 부분 일치(공백 · 가운뎃점 무시, 가장 늦은 거래일 값 · 등락률 높은 순 5). 지수 = 코스피 · 코스닥 · 코스피 200 이름 + 별칭(KOSPI · 종합 · KOSPI200 …), 시세 행 있는 것만. 뉴스 = **일주일 안** 제목 부분 일치 — 국내 시황 · 공시(광고성 제외) + 코인 기사, 최신 6. 코인 기사 태그는 시세 표에 있는 코인만 관련 종목으로. 빈 검색어 = 셋 다 빈 배열(읽기 0) | done |
| FR-2 | **지금 뜨는 업종** `GET /api/investment/search/rising-sectors?limit=`(1~20, 기본 5) → `{ asOf, items }` — **가장 늦은 거래일 값만**(11-06 에 멈춘 업종 `0027` 이 −7% 로 순위에 끼던 것) · 이름 있는 것만 · 등락률 높은 순. `asOf` = 줄 값 중 가장 늦은 시각 | done |
| FR-3 | **곁 칸** `GET /api/investment/search/related?assetType=&symbol=` 또는 `?sector=` → `{ basis, sector, items }`. 국내 종목 = 같은 지수업종(중분류 먼저 — `krSectorIndexCodeOf`) 유니버스 종목 · 자기 제외 · 등락률 높은 순 3 + 업종 등락률. 업종 = 구성 종목 5(지금 순위에 없는 업종은 `none`). 코인 = 30일 안 같은 기사에 함께 태그된 코인 3(많이 함께 나온 순, 시세 표에 없는 태그 건너뜀). 원천 없음 = `basis: none` · 빈 목록(지어내지 않는다) | done |
| FR-4 | **소유자 판정** — 업종 · 지수 · 국내 제목 · 국내 곁 칸은 국내 시세 소유자만(F011). 비소유자는 **빈 값**(404 아님 — 첫 화면 · 고른 행마다 부른다). 코인 기사 · 함께 태그는 로그인 모두 | done |
| FR-5 | **입력** — `q` ≤ 30 · `limit` 1~20 · 곁 칸은 종목(국내 6자리 · 코인 1~15 영숫자 — 대문자로) **또는** 업종(네 자리) 하나만(둘 다 · 둘 다 없음 400). 검색어 로그 0 | done |
| FR-6 | **비용** — 묶음 요청당 읽기 4(업종 표 · 지수 · 국내 제목 · 코인 제목) + 코인 태그 이름 1. 제목 검색은 `published_at` 인덱스로 창을 먼저 자른다(`EXPLAIN` 0.26ms · 0.08ms). 곁 칸 국내 = 업종 표 · 유니버스 시세 · 업종 매핑 2, 코인 = 태그 목록(상한 300) · 이름 1 | done |

순위 · 줄 수 · 창은 서버가 정한다(`domain/SearchExtras.ts` — 프론트 상수 금지).

## Acceptance Criteria

- [x] 규칙 표 테스트 — 이름 일치(가운뎃점 · 공백) · 지수 별칭 순서 · 지난 날 업종 제외 · 함께 태그 셈(`market/application/__tests__/searchExtras.test.ts`)
- [x] 유스케이스 — 소유자 / 비소유자(국내 읽기 0) / 빈 검색어 읽기 0 / 업종 분류 없는 종목 `none` / 시세 표 밖 태그 건너뜀
- [x] DTO 허용 · 거절 경계(`market/presentation/__tests__/searchDto.test.ts`)
- [x] 실데이터 — "삼성" 국내 제목 6 · "코스" 지수 둘 · 005930 → 전기·전자 3 · BTC → 이더리움 · 엑스알피 · 테더 · 묶음 10ms
- [x] Swagger 세 경로

## 계약 영향

- 새 경로 셋 — BFF `BFF-REQ-054` · 화면 `FE-REQ-066` FR-8. 기존 `/api/investment/search` 무변경
- `news` 공개 API 에 둘(`searchArticleTitles` · `symbolTagLists`) — `market` 의 ACL `SymbolNewsAdapter` 만 부른다

## Changelog

| 날짜 | 변경 |
|---|---|
| 2026-11-10 | 신규 · done — FR-1~6 `dd0bbdcc`. 곁 칸 근거를 "뉴스 관련주"에서 같은 업종 · 함께 태그로(원천 실측 · 사용자 결정) |
- 2026-11-10: F018 로그인 없이 시세 보기(`ADR-011` · 루트 `requirements/specs/done/F018-public-market-guest-slice.md`)가 이 REQ 의 파일을 걸침 — 이 REQ 의 FR 은 그대로, 바뀐 몫:
  - `bff/src/services/app-search.service.ts` — "국내 소유자 전용" 주석 · Swagger 문구 정정(판정은 서버 — 이제 사람 · 게스트 누구나)
  - `salt-server/src/market/application/SearchExtras.ts` — 국내 소유자 판정 걷기(`ADR-011`) — 시세 · 관심 · 거래 · 국내 판단 · 미러 · 복기 · 해설은 로그인 전체(시세는 게스트 포함), 전망 셋만 소유자
  - `salt-server/src/market/application/__tests__/searchExtras.test.ts` — 테스트를 새 계약으로 — 비소유자 거절 단언을 "누구나 · 키 꺼짐만 숨김"으로
  - `salt-server/src/market/presentation/investment.controller.ts` — 국내 소유자 판정 걷기(`ADR-011`) — 시세 · 관심 · 거래 · 국내 판단 · 미러 · 복기 · 해설은 로그인 전체(시세는 게스트 포함), 전망 셋만 소유자
