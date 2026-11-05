---
id: SLICE-F000-COOKIE-SESSION
title: "F000 쿠키 세션 2단계 — 토큰을 브라우저 저장소에서 빼고 httpOnly 쿠키로만 (FE-REQ-013 FR-80)"
priority: high
labels: [F000, frontend, bff, security, session, slice]
created: 2026-11-05
status: done
---

## Summary

사용자 "새브랜치 파고 다음 파이프라인 진행" — 마스터 인덱스 3a 다음 칸 둘(`FE-REQ-013` FR-80 2단계 · 서버 S2) 중 앞 칸.
가계부 S1 갈래가 끝나 "기능부터"가 미뤄 온 칸이 앞에 섰고, `FE-REQ-008` §6-4 미달 · `FE-REQ-011` FR-53 · `FE-REQ-028` FR-80 이 이것을 기다렸다. 한 줄:
**"토큰은 자바스크립트가 못 읽는 쿠키에만 있고, 브라우저는 BFF 를 같은 origin 으로 부르며, BFF 가 쿠키를 헤더로 바꾼다 — 다른 사이트에서 온 쿠키는 쓰지 않는다."**

> **done 2026-11-05** — 커밋 `fb9c85b3`(BFF) · `721063fc`(FE — 되돌리려면 이것 하나) · `99efcd15`(확인 중 발견한 기존 결함 — 머리 계정 메뉴).
> 검증 `requirements/reports/checklists/F000-cookie-session.md`. 영역 주인 `FE-REQ-013`(in-progress — 다른 FR) · `BFF-REQ-009` FR-54(신설 · done).

## 범위

| REQ | 이번 몫 |
|---|---|
| `FE-REQ-013` | FR-80 2단계 — 저장소 토큰 0 · Route Handler 셋 · 같은 origin 호출 · `withSessionRefresh` · 웹소켓 재연결 · 옛 세션 이관 |
| `BFF-REQ-009` | FR-54 신설 — 쿠키 → `Authorization`(같은 origin · 허용 origin 웹소켓만) · 국내 401 한 코드 |
| `FE-REQ-054` | 셸 rewrites `/api/*` → BFF · 로그아웃이 쿠키 지움을 기다림 · **머리 메뉴 쌓임 결함** |
| `OPS-001` | FR 추가 — 운영 경로 라우팅 `/api/session*` → 셸 · `/api/*` → BFF · `BFF_INTERNAL_URL` · `WEB_ORIGINS` |
| 그 밖 FE 18 · BFF 7 | 파일만 걸침(토큰 헤더 줄 제거) — 영역 REQ Changelog |

## 판단 — 리뷰가 볼 곳

1. **같은 origin 으로 부른다(교차 origin + `credentials: include` 가 아니라)** — `ADR-008` 이 운영을 한 origin 경로 라우팅으로 정했다. 같은 origin 이면 쿠키가 저절로 실리고 CORS 자격 증명 설정이 없다. 로컬은 셸 rewrites `afterFiles`(Route Handler 가 먼저) — 운영 라우팅도 `/api/session*` 만 셸로 둔다
2. **리프레시 쿠키 경로를 `/api/session` 으로 좁혔다** — BFF 로 가는 요청마다 실리지 않고, 갱신은 셸 Route Handler 가 서버에서 BFF 를 부른다. 브라우저는 성공 여부만 안다
3. **갱신 규칙을 "헤더가 있었나" → "보낼 때 로그인 표지가 있었나"로** — 쿠키에는 헤더가 없다. 표지는 보내기 **전에** 읽는다(응답 중 다른 탭 로그아웃). 경계 표 테스트
4. **BFF 가 쿠키를 믿는 조건** — 헤더가 없을 때만(앱 계약 그대로) · `Sec-Fetch-Site` same-origin/none(없으면 `Origin` 허용 목록) · 웹소켓은 브라우저가 same-site 로 보내 `Origin` 허용 목록만. 쿠키는 서버로 넘기지 않는다
5. **웹소켓은 연결 때만 쿠키가 실린다** — 15분 뒤 열린 연결은 옛 토큰을 쥔다. 인증 거부(서버 401 도 BFF 가 `KR_STOCK_AUTH_REQUIRED` 로 모은다)면 세션 갱신 뒤 연결을 새로 맺는다 — 1분에 한 번(계속 거부되면 되돌이 없음)
6. **로그인 · 초대 수락은 `credentials: "omit"`** — 같은 origin 이라 남은 세션이 저절로 실려 엉뚱한 사용자로 나가지 않게(1단계까지 "헤더를 붙이지 않는다"였던 것)
7. **옛 `localStorage` 세션은 첫 진입에 쿠키로 옮기고 지운다** — 리프레시 수명(7일) 뒤 이관 함수 · `LEGACY_*` 키를 같이 지운다

## 범위 밖

| 항목 | 사유 | 언제 |
|---|---|---|
| 리프레시 토큰 서버 무효화(진짜 로그아웃) | 서버에 세션 저장이 없다(JWT) | 서버 auth 를 platform 으로 옮길 때(`SRV-REQ-049`) |
| 로그인 응답 토큰이 자바스크립트를 한 번 지나는 것 | 로그인 · 초대 수락 응답 본문 → `/api/session` | 로그인을 Route Handler 가 대신 부르는 것은 다음 보안 칸 |
| 모바일(RN) | 보안 저장소 + 헤더 — 그대로 | — |

## Changelog

| 날짜 | 변경 |
|---|---|
| 2026-11-05 | 슬라이스 작성 · done |
