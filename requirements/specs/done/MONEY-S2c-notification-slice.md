---
id: SLICE-MONEY-S2C-NOTIFICATION
title: "돈 관리 앱 S2c — notification 서비스 이전(Kotlin) · 도메인별 알림 설정 기본 꺼짐 · 셸 /settings 알림 패널"
priority: medium
labels: [F015, server, db, bff, frontend, slice, msa]
created: 2026-11-06
status: done
---

## Summary

사용자 "새브랜치 파고 다음 파이프라인 진행" — 마스터 인덱스 §4-1 3a 다음 칸 **서버 S2c**(notification, `SRV-REQ-048` FR-5).
첫 **기존 컨텍스트 이전**이다(저축 · 가계부 · content 는 Kotlin 에서 새로 태어났다). 한 줄 — "알림은 내가 켠 도메인에서만 오고,
기본은 전부 꺼져 있다. 투자 · 저축 · 가계부 셋이 같은 길(이벤트 → notification)로 알림을 만든다".

> **done 2026-11-06** — 커밋 `9cee4715`(Kotlin notification · coach 발행 창구) · `33e949e8`(Express 은퇴 · 옛 표 drop) · `2fa68f61`(BFF) · `f1a3c64c`(FE).
> 영역 REQ 넷 in-progress(남은 FR 은 S3 identity). 검증 `requirements/reports/checklists/MONEY-S2c-notification.md`.

## 범위

| REQ | 이번 몫(S2c) | 남는 몫 |
|---|---|---|
| `SRV-REQ-048` | FR-5 알림 — 도메인별 설정(기본 꺼짐) · 구독 셋 · notification 이전 · 수용 기준 4 "설정 없는 사용자 발송 0" | FR-1~4 · 6~9(identity S3) |
| `DB-REQ-040` | FR-3 `notification_pref` — **주인을 identity → notification 으로 정정**(판단 2) · 수용 기준 2 | FR-1 · 2 · 4~6(S3) |
| `DB-REQ-036` | 부록 notification 행 이동(`InvestmentNotification` → `notification.notification`) · B7 정리 워커 · `svc_notification` · `svc_coach` 로그인 | 나머지 서비스 단계 |
| `SRV-REQ-044` | FR-4 새 이벤트 `coach.DecisionChanged`(14번째) · 첫 Express 발행(아웃박스 표만 Kotlin) | 나머지 이벤트 |
| `BFF-REQ-046` | FR-8 `GET/PUT /api/app/me/notifications` · 알림 경로 platform | 홈 카드 · 온보딩(S3) |
| `FE-REQ-055` | FR-6 셸 `/settings` 알림 패널 | FR-5 내 데이터(S3) |
| 짝 | Express `notification` 은퇴(`SRV-REQ-008` FR-20~25 · `SRV-REQ-009` 경로) · coach 통보 포트(`DB-REQ-017` 원인) · BFF 알림 뷰모델(`BFF-REQ-007`) · 라우팅 표(`BFF-REQ-045`) · 플랫폼 설정(`SRV-REQ-043` · `045`) · S6 발행 창구(`SRV-REQ-049`) | — |

## 판단 — 리뷰가 볼 곳

1. **Express coach 의 알림은 이벤트로 — 브로커 클라이언트를 Express 에 두지 않는다.** coach 는 S6 까지 Express 라 판단 변화를 낼 길이 셋이었다:
   (a) Express → Kotlin 내부 REST — 서버가 남의 주소를 알게 된다(`msa-services.md` §6) · (b) Express 에 amqplib + 자체 릴레이 — S6 에 지울 코드가 생긴다 ·
   (c) **`coach.outbox` 표만 Kotlin Flyway 로 세우고 Express 가 행을 쓰고 플랫폼 릴레이(svc_coach)가 보낸다.** (c) — S6 에 coach 가 Kotlin 으로 오면 같은 표를 `OutboxWriter` 가 이어 쓴다.
   본문은 계약 파일 하나(`contracts/events/coach.DecisionChanged.json`)와 Express 테스트가 맞춘다(Kotlin 쓰기 시점 검증을 지나지 않는 첫 발행)
2. **설정 주인은 notification** — `DB-REQ-040` FR-3 은 identity 스키마였다. 이벤트를 받을 때마다 읽는 쪽이 notification 이라 identity 에 두면 남의 스키마를 읽거나 프로젝션을 새로 만들어야 한다(`msa-services.md` §4 "한쪽이 주인"). FR-3 을 정정했다
3. **꺼짐 = 받을 때 안 쌓음 + 나중에 끄면 목록에서 빠짐** — 켜도 지난 이벤트를 되살리지 않는다. 옮긴 옛 투자 알림(1행)도 투자를 켜야 보인다 — 기본 꺼짐 결정(FEATURE-015 FR-4)이 기존 사용자에게도 걸린다
4. **2시간 억제 · 금액 관문은 받는 쪽으로** — Express coach 는 "최근에 보냈나"를 알림 표에서 읽었다(남의 표). 이제 notification 이 같은 원인(사용자 · 출처 · 종목 · 코드)의 창을 본다. 금액 관문은 옛 Express 규칙 그대로 + BFF 가 한 번 더
5. **`household.MonthClosed` 는 구독하지 않는다** — 설계 문서는 MonthClosed → notification 이었지만 사용자가 직접 닫은 일을 다시 알리는 셈이다. 가계부는 사용자가 안 한 일(고정비가 오름 — `FixedCostIncreased`)로 알린다. 재촉 0(MONEY 글로벌 플랜 판단 5)
6. **은퇴 경로(`msa-services.md` §7)** — 옛 경로 소비처가 BFF 알림 하나라 같은 PR 에서 옮겼다: 가져오기 SQL(대조) → BFF 라우팅 → Express 코드 · Prisma 모델 삭제. 쓰기 경로가 둘인 기간 0

## 범위 밖

| 항목 | 사유 | 언제 닫히나 |
|---|---|---|
| 웹 알림 목록 · 헤더 벨 | 화면이 없다 — F006 알림 화면(`FE-REQ-030` FR-80 · 81 · 110). BFF `/api/app/alerts` 는 준비됨 | F006 착수 시 |
| 앱 푸시 | 앱 미착수(`RN-REQ-035` FR-4 — 도메인 알림을 켤 때 권한 요청) | RN 착수 시 |
| 금융 팁 도메인 알림 | 알림으로 낼 원천이 없다(때맞춘 팁은 화면 칸) | 필요가 생길 때 |
| identity 몫(온보딩 · 내보내기 · 삭제 · JWKS) | `SRV-REQ-048` S3 | 서버 S3 |

## Changelog

| 날짜 | 변경 |
|---|---|
| 2026-11-06 | 신규 · done — notification 이전 · 도메인별 설정 · 구독 셋 · coach 발행 창구 · 셸 알림 패널 |
