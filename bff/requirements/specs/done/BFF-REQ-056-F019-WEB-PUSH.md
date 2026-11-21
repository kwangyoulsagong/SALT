---
id: BFF-REQ-056
feature: F019
area: bff
kind: API
title: "웹 푸시 경로 셋 — 설정 · 이 기기 구독 넣기 · 빼기(`/api/app/me/push`)"
priority: high
created: 2026-11-21
status: done
source: "`SRV-REQ-062` 짝 — F019 순서 4"
---

## FR

| FR | 내용 |
|---|---|
| FR-1 | `GET /api/app/me/push` → `{ enabled, publicKey }` — 켜짐은 공개키 문자열이 있을 때만 · 꺼지면 키 null(`toPushConfig`). `no-store` |
| FR-2 | `PUT /api/app/me/push/subscription` — 브라우저 `toJSON()` 에서 서버가 쓰는 세 칸만(`endpoint` · `keys.p256dh` · `keys.auth`) 넘긴다 · 값 판정은 서버(400 그대로) · 204 |
| FR-3 | `DELETE /api/app/me/push/subscription` `{ endpoint }` · 204 |

라우팅 표(`config/server-routes.json`)는 그대로 — `/notifications` 줄이 `/notifications/push/*` 를 platform 으로 보낸다.

## Changelog

| 날짜 | 변경 |
|---|---|
| 2026-11-21 | 신규 · **done**(`feat/f019-s4-web-push`) — 시험 3(설정 경계 6 · 본문 고르기 · 경로 1:1) · 실경로(설치 Chrome → BFF → Kotlin → FCM) 확인. 루트 `F019-s4-web-push-slice.md` |
