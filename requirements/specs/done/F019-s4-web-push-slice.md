---
id: F019-S4-WEB-PUSH
title: "F019 순서 4 — 휴대폰 웹 푸시(기기 구독 · VAPID 회차 · 서비스 워커 push · 열 때 대조)"
created: 2026-11-21
---

## Summary

사용자 2026-11-21 "새 브랜치 파고 다음 파이프라인 진행" — F019 마지막 순서. 전 영역(서버 · DB · BFF · FE). 계약 변경이 있어 한 PR(`pr-convention.md` §7).

| REQ | 영역 | 산출물 |
|---|---|---|
| `SRV-REQ-062` | Kotlin `notification` | 구독 넣기 · 빼기 · 설정 · 보내기 회차 · JDK 암호(RFC 8291) · VAPID(RFC 8292) |
| `DB-REQ-046` | Flyway `notification` V3 | `push_subscription` · `notification.pushed_at` |
| `BFF-REQ-056` | BFF | `/api/app/me/push` · `/push/subscription` PUT · DELETE |
| `FE-REQ-078` | `/m` | 홈 알림 칸 · 서비스 워커 `push` · `notificationclick` · 열 때 대조 · `@repo/core/mobile` `push` 판정 |
| 운영 | `ops/vapid-keys.mjs` | 키 한 쌍 — 로컬 `salt-platform/.env` 에 넣고 켬(`PUSH_ENABLED=true`) |

## 판단

1. **도메인 켬/끔은 새로 만들지 않는다** — 기존 `notification_pref`(데스크톱 설정과 한 벌)가 알림 행을 거른다. 휴대폰 토글 켜짐 = 도메인 켬 **그리고** 이 기기 구독
2. **잠금 화면 문장은 종류마다 고정 한 줄** — 알림 인자(종목 · 목표 틀 · 분류)를 싣지 않고 주소도 탭까지. 잠금 화면은 휴대폰을 든 누구나 본다. 서버가 화면 문장을 만드는 유일한 자리(Declarative 는 앱 코드 없이 띄워서) — 불변식 2(문장 0)의 예외를 `Push.kt` 머리에 적었다
3. **보내기는 회차(10초) · 표시 먼저** — 알림 리스너 트랜잭션 안에서 HTTP 를 하지 않는다. 많아야 한 번(잠금 화면 중복보다 잃는 쪽) · 30분 지난 것은 보내지 않음(재기동 폭주 0)
4. **구독 주소 허용 목록** — 서버가 요청 본문 주소로 POST 한다. 알려진 푸시 서비스 접미 · https · 포트 없음만
5. **라이브러리 0** — 규칙 표 밖 추가는 REQ 가 먼저인데, JVM 웹 푸시 라이브러리는 오래됐다(리서치 미확인 항목). JDK 의 ECDH · AES-GCM · HMAC · `SHA256withECDSAinP1363Format` 으로 충분 — 시험 벡터로 묶었다
6. **설치 앱에서만** — iOS 규칙을 모든 브라우저에 같은 선으로(`FEATURE-019` FR-12)

## 확인

`requirements/reports/checklists/F019-s4-web-push.md`
