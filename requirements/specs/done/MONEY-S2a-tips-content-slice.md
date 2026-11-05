---
id: SLICE-MONEY-S2A-TIPS-CONTENT
title: "돈 관리 앱 S2a + F5a — content 서비스 첫 판(Kotlin) · 금융 팁 공개 zone 첫 화면 · 때맞춘 팁 칸"
priority: medium
labels: [F014, server, db, bff, frontend, slice, msa]
created: 2026-11-05
status: done
---

## Summary

사용자 "새브랜치 파고 다음 파이프라인 진행" — 마스터 인덱스 §4-1 3a 다음 칸 **서버 S2**(`DB-REQ-039` · `SRV-REQ-047` · notification).
S2 는 서비스 둘(content · notification)이라 나눈다(`msa-services.md` §1 ① — 서비스 이름 하나). 이번 **S2a = content** 한 줄 —
"공적 제도 글이 유효기한 · 법적 선 검사를 지나야 나가고, 저축 이벤트에 맞춰 한 줄이 뜬다". 짝 BFF-049 · FE-058(F5a)을 같이(새 도메인 첫 판 관례 — S1a · 가계부 S1a 와 같다).
**공개는 꺼진 채** — 법무 확인 기록 전(사용자 결정 2026-10-30).

> **done 2026-11-05** — 커밋 `38e2d16d`(서버 content) · `dd7f536a`(법적 선 꼬리) · `36d1f7b9`(BFF) · `5cc3b415`(@repo/ui 카드) · `6f9cab4b`(lint) · `9e6973ae`(팁 zone) · `5915638f`(때맞춘 팁 칸). 4 REQ in-progress(남은 FR 은 S2b). 검증 `requirements/reports/checklists/MONEY-S2a-tips-content.md`.
> 수용 기준: `DB-REQ-039` 2/2 · `SRV-REQ-047` 3/3 · `BFF-REQ-049` 2/2 · `FE-REQ-058` 3/4(LCP 미측정).

## 범위

| REQ | 이번 몫(S2a) | 남는 몫 |
|---|---|---|
| `DB-REQ-039` | FR-1~5 · 7 · **FR-8 `user_signal` 신설** · FR-3 트리거로 정정 | ~~FR-6 퀴즈(S2b)~~ **정정 2026-11-05(S2b)** FR-6 done(S2b) |
| `SRV-REQ-047` | FR-1 · 2 · 3 · 5 · FR-4(저축 두 이벤트 · 달 셋) · FR-7 첫 판(이력) · 공개 플래그 | ~~FR-4 나머지 트리거 · 6 · 8 · 9(S2b)~~ **정정 2026-11-05(S2b)** FR-8 done(S2b) · FR-4 나머지 · 6 → S2d · 9 → S3 **정정 2026-11-05(S2d)** 내 숫자 · 고정비 증가(주거) 닫힘(`MONEY-S2d-tips-my-numbers`) — 나머지 트리거는 원천 · 글이 생길 때 |
| `BFF-REQ-049` | FR-1~5 · 라우팅 표 `/content` | — |
| `FE-REQ-058` | FR-1 · 2 · 6 · 7 · 8 · FR-4 첫 판 · 색인 | ~~FR-3 · 5 · LCP(S2b · 공개 직전)~~ **정정 2026-11-05(S2b)** FR-5 done(S2b) · FR-3 → S2d · LCP 공개 직전 **정정 2026-11-05(S2d)** 내 숫자 · 고정비 증가(주거) 닫힘(`MONEY-S2d-tips-my-numbers`) — 나머지 트리거는 원천 · 글이 생길 때 |
| 짝 | `SRV-REQ-044` 첫 서비스 간 구독 · `DB-REQ-036` `svc_content` 로그인 · `FE-REQ-043` 공개 zone 제외 · lint `no-client-enum-export`(`DEV-001`) | notification 이전(S2c, `SRV-REQ-048`) |

## 판단 — 리뷰가 볼 곳

1. **원문은 레포 파일, 서버가 주인**(FEATURE-014 열린 질문 → 1안) — `content/tips/*.md` · `policy-params.json`. 고치는 길이 PR 하나라 검수 = 리뷰. 발행 검사는 **빌드(`CatalogSpec`)와 기동(`SyncCatalog`) 둘 다** — 틀린 글이 나가느니 서버가 안 뜬다. 본문은 마크다운 전부가 아니라 세 꼴(제목줄 · 문단 · 목록)만 구조로 내린다 — HTML 0 · 링크는 출처 한 칸
2. **법적 선은 넓게** — 상품명(업권 꼬리 · 이름 + 은행/카드) · 금리 비교 · 본문 URL · 명령형 · 완곡 권유 · 종목 · 매매 시점 · 확신. 출처는 `.go.kr` + 공공기관 몇 곳만. 법무 확인 전이라 놓치는 것보다 글쓴이가 고치는 편이 싸다
3. **공개 플래그 하나가 색인까지 정한다** — 서버 `CONTENT_PUBLIC`(기본 꺼짐). 프론트는 목록 `public` 으로 robots 를 정하고 글은 목록이 공개 · slug 있을 때만 부른다. 프론트에 "확인됐다" 상수 0
4. **때맞춘 팁은 서버가 고르고 화면은 칸만** — 이벤트 트리거(신호 90일 · 최근 먼저) → 달 트리거 → 원문 순서, 0~1건 · 닫은 것 · 확인 필요 제외. 칸 연결은 `web-shared`(domain 끼리 import 금지 · 셋이 같은 칸)
5. **content 가 첫 서비스 간 구독자** — 저축 쓰기 → 아웃박스 → RabbitMQ → content 큐(데드레터 · 멱등)를 종단 테스트가 실 브로커로 잇는다

## 범위 밖

| 항목 | 사유 | 언제 닫히나 |
|---|---|---|
| 공개 · 법무 확인 | 사용자 결정 — 확인 기록 전 공개 금지 | 확인 기록 시 `CONTENT_PUBLIC=true` |
| notification 서비스 이전 | S2 의 다른 서비스(`SRV-REQ-048`) | 서버 S2c |
| 내 숫자로 · 퀴즈 · 줄 diff · 홈 카드 · 나머지 트리거 | 첫 판 위에 얹는 기능 | ~~금융 팁 S2b~~ **정정 2026-11-05(S2b)** 퀴즈 · 줄 diff 닫힘(`MONEY-S2b-tips-quiz-diff`) · 내 숫자 · 나머지 트리거 S2d · 홈 카드 S3 **정정 2026-11-05(S2d)** 내 숫자 · 고정비 증가(주거) 닫힘(`MONEY-S2d-tips-my-numbers`) — 나머지 트리거는 원천 · 글이 생길 때 |
| LCP 2.5s | 운영 빌드 휴대폰 폭 측정 전 | 공개 직전 |
| 코치 검증기와 한 모듈 | 언어가 다르다 | S6(`SRV-REQ-049` FR-4) |
