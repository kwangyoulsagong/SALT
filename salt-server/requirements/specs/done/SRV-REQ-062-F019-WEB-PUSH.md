---
id: SRV-REQ-062
feature: F019
area: backend
kind: API
title: "웹 푸시 — 기기 구독 · VAPID 보내기 회차 · 사라진 구독 지움(notification 서비스)"
priority: high
created: 2026-11-21
status: done
source: "사용자 2026-11-21 \"새 브랜치 파고 다음 파이프라인 진행\" — `F019-mobile-pwa-global-plan.md` 순서 4 · `FEATURE-019` FR-12 · `ADR-012` 푸시 행"
---

## Summary

알림이 한 건 생기면 그 사람의 기기마다 웹 푸시를 한 번 보낸다. 서비스는 Kotlin `notification`(구독만 하던 서비스 — `SRV-REQ-048` FR-5).
도메인별 켬/끔은 기존 설정(`notification_pref`)이 그대로 정한다 — 꺼진 도메인은 알림 행이 안 생기니 푸시도 0. 기기 구독은 새 표 `push_subscription`(`DB-REQ-046`).

**불변식**

1. 잠금 화면에 금액 · 이름 · 종목 0 — 문장은 종류마다 고정 한 줄(`PushMessage`), 알림 인자를 싣지 않는다. 누르면 탭(`/m/goals` 등)으로 — 주소에도 id 0
2. 보내는 곳은 알려진 푸시 서비스의 https 만(FCM · Mozilla · Apple · WNS 접미) — 구독 주소는 요청 본문으로 오고 서버가 그곳에 POST 하므로
3. 한 알림은 많아야 한 번 — 보내기 전에 표시(`pushed_at`, `UPDATE … RETURNING` · `SKIP LOCKED`)
4. 404 · 410 이면 구독을 지운다 · 그 밖의 실패는 남긴다

## FR

| FR | 내용 |
|---|---|
| FR-1 | `PUT /api/notifications/push/subscription`(브라우저 `toJSON()` 모양 · 다시 불러도 행 하나 · 같은 주소를 다른 사람이 넣으면 주인 바뀜) · `DELETE`(본인 것만 · 없어도 성공). 형식 · 허용 주소 · 키 길이(65 · 16) 틀리면 400 `PUSH_SUBSCRIPTION_INVALID` · 서버 푸시 꺼짐이면 503 `PUSH_DISABLED` |
| FR-2 | 보내기 회차 — 10초 고정 지연 · ShedLock `notification-push` · 한 회차 100건 · 30분 넘은 미표시 알림은 보내지 않고 표시만(서버가 오래 꺼졌다 켜져도 한꺼번에 울리지 않게). 트랜잭션은 표시 · 지우기 둘만, HTTP 는 밖 |
| FR-3 | 보내기 — RFC 8291 `aes128gcm` 한 레코드 · RFC 8292 VAPID(ES256 · 12시간 · 푸시 서비스 origin) · `TTL` 86400 · `Urgency normal` · 재시도 0(쓰기). 본문은 Declarative Web Push(`web_push: 8030` · `notification.navigate` 절대 주소). **라이브러리 0 — JDK 암호만**(`kotlin-platform.md` §1 표 밖 추가 없음) |
| FR-4 | `GET /api/notifications/push/config` → `{ enabled, publicKey }` · 설정 `salt.notification.push.*` 기본 꺼짐 — 켜면 키 둘 · subject · 공개 주소가 다 있어야 기동, 키 짝이 틀려도 기동 실패. 키는 `node ops/vapid-keys.mjs` |
| FR-5 | 내 데이터 — `push_subscription` 은 사람 표(등급 `record: 알림 받을 기기`) · 내보내기엔 주소 · 시각만(암호 키 둘 빼고) · 계정 삭제가 지운다 |

## 수용 기준

- RFC 8291 부록 A 시험 벡터와 바이트까지 같다
- 실 FCM 왕복: 브라우저 구독 → 저축 목표 도달 → 회차 → FCM → 브라우저 서비스 워커가 풀어 알림 한 장(이름 · 금액 0)
- 허용 밖 주소(`localhost` · 메타데이터 IP · http · 포트 · 접미 흉내) 400

## 하지 않는 것

- 문장 다국어 · 종목 이름을 잠금 화면에(불변식 1) · 묶음 알림(같은 회차 여러 건을 하나로) — 지금 종류는 억제 창(2시간)이 이미 있다
- 푸시 서비스 429 의 `Retry-After` 존중 — 재시도 0 이라 그 기기 그 회차만 놓친다

## Changelog

| 날짜 | 변경 |
|---|---|
| 2026-11-21 | 신규 · **done**(`feat/f019-s4-web-push`). 짝 `DB-REQ-046` · `BFF-REQ-056` · `FE-REQ-078`. 루트 `requirements/specs/done/F019-s4-web-push-slice.md` |
