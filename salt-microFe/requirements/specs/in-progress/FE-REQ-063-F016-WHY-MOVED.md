---
id: FE-REQ-063
feature: F016
area: frontend
kind: UI
title: "왜 올랐을까 · 떨어졌을까 카드 · 시장 상태 띠 · 상태 칩 · 국내 오늘 소식 · 장중 수급"
priority: high
created: 2026-11-06
source: pm/requirements/specs/in-progress/FEATURE-016-why-moved.md
---

## Summary

`FEATURE-016` 화면. 투자 zone(`domain-invest`) — 국내 종목 상세 · 코인 상세 · 시장 표 · 국내 요약 띠. 값 · 문장 · 보일지 여부 전부 BFF/서버(프론트 상수 0).

## FR

| FR | 내용 |
|---|---|
| FR-1 | **카드** — 제목 "왜 올랐을까"/"왜 떨어졌을까"(방향은 응답 부호) · ① 분해 막대(시장 · 업종 · 고유 — %p, 색 + 글자 부호) · ② 사실 목록(시각 · 출처 · 제목/값, 원천 `unavailable` 은 그 줄만) · ③ 한 줄 + 인용 표시 `[n]`(누르면 그 사실로) + AI 생성 표시. ③ 없으면 ①②만 |
| FR-2 | **시장 띠** — 서킷브레이커 · 사이드카(국내 요약 띠 · 국내 상세 머리). `source=inferred` 면 "추정" |
| FR-3 | **상태 칩** — VI(정적/동적 · 해제 시각) · 임시정지 · 거래정지 · 시장경보 · 관리 · 정리매매 · 단기과열. 정지 · 단일가 중 값 옆 "마지막 체결 HH:MM:SS". 기존 `KrQuoteBadges` · 3분 지난 시세 배지를 넓힌다(새 컴포넌트 만들기 전 기존 것 — done 체크리스트 §2-1) |
| FR-4 | **오늘 소식**(국내 상세) — 제목 · 제공처 · 시각 · 공시/시황 칩. 링크 없음(원천에 없다) |
| FR-5 | **장중 수급**(국내 상세) — 기존 `KrInvestorFlows` 옆 "오늘(HH:MM 기준)" 줄 · 프로그램 |
| FR-6 | **시장 표** — 행 상태 칩(VI · 정지 · 경보) · 카드 조건 행 표시(누르면 상세 카드로) |
| FR-7 | 문구 — 인과 단정 · 앞날 · 매매 지시 0(문구 grep) · 해요체. AI 표시 문구는 서버 코드 → `messages.ts` |
| FR-8 | 상태 — 로딩(①② 먼저 · ③ "정리하는 중") · 실패 줄 · 비소유자 국내 0 · 390 웹뷰 한 열 · 1024~1600 넘침 0 · axe · 줄인 모션(막대 등장만) |

## 진행 — 단계 A done(2026-11-06)

| FR | 상태 | 구현 |
|---|---|---|
| FR-2 시장 띠 | done | `entities/market` `KrMarketActionBanner` — 국내 요약 띠 위 · 국내 상세 머리. 걸린 것 = `StatusLine` blocked(읽어 주기) · 오늘 끝난 것 = 장 상태 줄 회색 한 줄 · `inferred` 면 "추정"(title 로 이유) |
| FR-3 상태 칩 | done | `KrQuoteBadges` 넓힘 — 칩 넷 · VI 종류(정적 · 동적) · 마지막 체결 칩(그때는 "N분 전 시세" 대신). 상세 머리는 정지 줄 "{이유} · 마지막 체결 HH:MM:SS" — 옛 줄이 **시세 받은 시각**을 마지막 체결로 쓰던 것을 서버 `lastTradeAt` 으로 정정 |
| 그 밖 | ~~단계 B~D~~ 단계 C · D | FR-1 · ~~4 · 5~~ · 6 |

루트 `requirements/specs/done/F016-A-market-status-tags-slice.md`

## 진행 — 단계 B done(2026-11-06)

| FR | 상태 | 구현 |
|---|---|---|
| FR-4 오늘 소식 | done | `pages/investment-detail` `KrStockNews` — 시세 사실 줄 아래 · 코치 판단 위. 시각 · 제공처 · 공시/시황 칩(`@repo/ui/badge`) · 제목(링크 0 · 긴 제목 줄바꿈) · 마지막 수집 시각. 제공처 이름이 칩과 같으면("공시") 한 번만 · 2분 재조회 |
| FR-5 장중 수급 | done | 기존 `KrInvestorFlows` 카드 머리에 "오늘 프로그램 순매수 · HH:MM 기준 ±N억"(매수 · 매도 · 수량은 title) — 오늘 값이 없으면 줄 없음. ~~외국인 · 기관 장중~~ 원천 없음 · 5분 재조회 |

- 루트 `requirements/specs/done/F016-B-kr-news-flows-slice.md`

## 진행 — 단계 C done(2026-11-09)

| FR | 상태 | 구현 |
|---|---|---|
| FR-1 카드 ①② | done | `entities/market` `WhyMovedCard`(표시 전용) — 국내 상세 머리 바로 아래 · 코인 상세 오른쪽 열 맨 위. `show` 면 "왜 올랐을까 · 떨어졌을까" 카드, 아니면 접힌 한 줄 "오늘 등락 나눠 보기". 분해 표(가운데 0 막대 + 부호 글자) · "원인을 뜻하지 않아요" 한 줄 · 같은 날 사실(사건 코드 → 사실 문장) · 원천 실패 줄. 불러오는 중 · 실패 · 비소유자엔 자리 없음 |
| 프리뷰 한 줄 | done | `WhyMovedPreview` — 시장 표 우측 프리뷰 맨 위 "왜 떨어졌을까?"(카드 날만) · 가장 큰 몫 둘 · 사실 하나 · 자세히(셰브론). 단계 D 의 ③ 문장 자리(사용자 2026-11-09 "프리뷰에도 나와야지") |
| FR-6 표 행 | done | `WhyMovedRowChip` "왜?" — 서버 `moveCard` 행만 · 누르면 상세 `#why-moved` |
| 국내 프리뷰 오늘 소식 | done | `KrNewsPreview` — 코인 뉴스 프리뷰와 같은 카드(제목 한 줄 · 제공처 · N분 전 · 공시/시황 배지). 링크 · 요약은 원천에 없다(사용자 2026-11-09 "코인처럼 뉴스") |
| FR-1 ③ | done(2026-11-12 단계 D) | `WhyMovedCard` `MoveSummaryLine` — ① 표 아래 · ② 목록 위. `[k]` → 번호 칩(누르면 그 사실 줄 · `:target` 바탕) · `ai` 면 `ADR-009` §3 AI 표시 · 조용한 날 서버 문장은 표시 없이 · `pending` "정리하는 중" · 막힘 · 꺼짐 · 못 읽음은 그리지 않음. 프리뷰는 사실 한 줄 자리에 ③(번호 빼고 두 줄 말줄임 + AI 표시) |

- 디자인은 기능만(사용자 2026-11-09 "디자인 개선은 추후 스펙") — 깨짐 막기(넘침 · 줄바꿈 · 720 폭 · 대비)까지
- 루트 `requirements/specs/done/F016-C-move-split-facts-slice.md`

## Acceptance Criteria

- [ ] 실화면 — 큰 등락 종목(국내 · 코인) 카드 · 정지 띠(재생 데이터 또는 Playwright `route`) · 칩
- [ ] Playwright — 원천 실패 · ③ 없음 · 생성 중 · 비소유자 · 만료 세션 — **③ 몫 닫음 2026-11-12**(ok · pending · quiet · guard_blocked · 낡은 인용 route 강제, 실데이터 국내 3 · 코인 1). 비소유자 · 만료 세션은 F018 뒤 국내 공개라 해당 없음
- [ ] axe 새 요소 0 · 넘침 0 · 문구 grep 0
- [ ] 번들 — 투자 zone 상세 증가분 기록(`FE-REQ-029`) — 단계 D: 상세 첫 로드 153kB(단계 C 뒤 F017 단계 6 과 같음 — ③ 증가 0, worktree 운영 빌드)

## 계약 영향

- `BFF-REQ-051` · 기존 `FE-REQ-041`(국내 화면) · `FE-REQ-050`(요약 띠)

## FR — v4 (2026-11-13 · 전 영역 계획 `requirements/specs/in-progress/F017-v4-one-panel-global-plan.md`)

| FR | 내용 | 상태 |
|---|---|---|
| FR-9 | **왜 움직였나를 원인 → 근거 → 결과로** — 종목 상세의 `WhyMovedCard` 는 시나리오 패널의 한 줄로 들어간다(`FE-REQ-064` FR-9 ②). 시세 목록 오른쪽 프리뷰(`WhyMovedPreview`)는 남기되 **원인 한 줄 + 근거 둘(숫자 · 평소 대비 · 이름 출처)** — 지금처럼 출처를 지운 한 문장만 보이지 않는다. 문장 속 등락 숫자가 지금 값과 다르면 그리지 않는다(서버 검사 `SRV-REQ-052`) | **일부 2026-11-13** — 상세 카드 · 미리보기 원인 줄. 패널 안으로는 순서 1e |

## Changelog

| 날짜 | 변경 |
|---|---|
| 2026-11-12 | F017 단계 6(측정 태그 · `SRV-REQ-053` FR-6)이 이 REQ 자리에 더함 — 왜 움직였나 사실 줄 아래 측정 태그 칩(소식만 · `NewsTagChips` 한 벌). 분해 · 사실 순서는 그대로 |
| 2026-11-06 | 신규(to-do) |
| 2026-11-06 | 단계 B 확인 2회차 — 로딩 상태 실화면 · 레이어 훅 사후 실행 다시(첫 보고는 검사 없이 통과) |
| 2026-11-06 | 단계 B done — FR-4 · FR-5(프로그램만). 실화면 1024~1600 · 390 웹뷰 넘침 0 · axe 새 카드 0 · 실패 · 빈 · 비소유자 · 만료 세션 |
| 2026-11-06 | in-progress — 단계 A(FR-2 · 3) done. 실화면 · axe(새 요소 0) · 390 웹뷰 · 번들 증가분은 체크리스트 |
| 2026-11-06 | 확인 2회차 — 결함 1(표 행 칩이 가격 열을 밀어냄) → 표 간결 모드(칩 2 + "+N" · 마지막 체결은 정지 칩 안). 1024~1600 넘침 0 · 실패 · 비소유자 · 만료 세션 |
| 2026-11-09 | 단계 C — FR-1(①②) · FR-6 · 프리뷰 한 줄 · 국내 프리뷰 오늘 소식. 실화면 1024~1600 · 390 웹뷰 넘침 0 · axe 0 |
| 2026-11-09 | FR-4 오늘 소식 · 국내 프리뷰 — 뉴스 행 한 벌 · 상세 모달로(`FE-REQ-065`) |
| 2026-11-09 | 확인 2회차 — 결함 1: 국내 프리뷰 "오늘 소식" 제목이 블록 밖이라 꺼짐 · 404 때 제목만 남았다 → 블록 안으로 |
| 2026-11-09 | 기사 본문(`SRV-REQ-054` · `BFF-REQ-053` · `FE-REQ-068` 주인) — `KrStockNews` 가 `krNewsToView` 에 종목 코드를 넘긴다(본문 경로 `bodyRef`) |
- 2026-11-10: F018 로그인 없이 시세 보기(`ADR-011` · 루트 `requirements/specs/done/F018-public-market-guest-slice.md`)가 이 REQ 의 파일을 걸침 — 이 REQ 의 FR 은 그대로, 바뀐 몫:
  - `salt-microFe/packages/domain-invest/src/pages/investment-detail/ui/KrInvestorFlows.tsx` — "국내 소유자 전용" 주석 정정(`ADR-011`)
  - `salt-microFe/packages/domain-invest/src/pages/investment-detail/ui/KrStockNews.tsx` — "국내 소유자 전용" 주석 정정(`ADR-011`)
  - `salt-microFe/packages/domain-invest/src/pages/investment-detail/ui/KrWhyMoved.tsx` — "국내 소유자 전용" 주석 정정(`ADR-011`)
| 2026-11-12 | 단계 D — FR-1 ③ done. 실화면 1440 · 390(앱 웹뷰 UA) · 코인 상세 · 프리뷰 · 상태 5종(route) · 넘침 0 |
| 2026-11-12 | 단계 D 마무리 — FR-7 문구 grep 0 · `i18n-policy` 원인 단정어 줄(`ADR-009` §5) · AI 표시 대비(axe) |
| 2026-11-13 | **v4**(`requirements/specs/in-progress/F017-v4-one-panel-global-plan.md`) — FR-9 원인 근거 결과 모양 · 프리뷰 출처 이름 · 상세 카드는 시나리오 패널로 |
| 2026-11-13 | **F017 v4 순서 1b**(`feat/f017-v4-s1-scenario-always`) FR-9 **일부** — `WhyMovedCard` 맨 위 원인 → 근거 → 결과 세로 칸(단계 배지 · 단계를 정한 근거 굵게 · 이름 출처 칩 · 용어 풀이 · 다른 가능성 접힘) · 소식 원인은 아래 그 사실 줄로 이음 · 미리보기는 ③ 이 없을 때 '가장 유력 · 머리말'. 결과 칸이 오늘 등락을 말하면 아래 같은 숫자 줄을 뺀다. 접힌 카드 요약에 heading 역할(axe heading-order — main 에도 있던 결함). 패널로 옮기는 것은 순서 1e |
| 2026-11-13 | F017 v4 1e 짝(`FE-REQ-064` · `BFF-REQ-052`) — `WhyMovedCard.tsx`(머리 주인) `hideCause` — 패널이 원인 칸을 그리는 자리에서 끈다(① 분해 · ② 사실은 그대로). 동작 변경은 그 자리뿐 |
