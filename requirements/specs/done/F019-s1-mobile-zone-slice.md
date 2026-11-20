---
id: F019-S1-MOBILE-ZONE
title: "F019 순서 1 — 휴대폰 PWA zone 골격(/m · 매니페스트 · 서비스 워커 · 하단 탭 · 로그인 · 데스크톱 → /m 이동)"
created: 2026-11-20
---

## Summary

`ADR-012` 순서 1 · `FE-REQ-071`. 화면 없이 틀만 — 설치 · 실행 · 탭 이동 · 로그인 · 데스크톱 주소에서 넘어오기. 서버 · BFF 변경 0(같은 계약 · 같은 쿠키).

| 산출물 | 위치 |
|---|---|
| zone | `salt-microFe/apps/web-mobile`(3006) · 레지스트리 `mobile`(`surface`) · `mobileRedirects` |
| 판정 | `@repo/core/mobile`(`mobileRedirectOf` · `MOBILE_PATHS`) · 데스크톱 zone 다섯 `middleware.ts` |
| 틀 | `@repo/web-shared/layout/mobile` · 로그인 폼 `@repo/web-shared/layout/sign-in`(셸과 한 벌) |
| 규칙 | 레이어 `mobile-domain` · 휴대폰 글자 `appType` 만(래칫 시험) · 운영 `ops/salt.sh` `web-mobile` |

## 판단

1. **대응표는 실제 화면이 있는 곳만**(`/` · `/login` → `/m/login`) — 탭 넷은 자리 한 장이라 데스크톱 링크를 거기로 보내지 않는다. 화면을 옮기는 `FE-REQ-072` 가 행을 더한다
2. **배럴 밖 입구 둘** — 레이아웃 배럴에 두면 데스크톱 zone 다섯 번들에 휴대폰 · 로그인 폼이 딸려 간다
3. **오프라인 한 장은 Next 페이지가 아니라 완결된 HTML** — 오프라인이면 그 페이지 청크가 없을 수 있다
4. **서비스 워커는 손으로 쓴 60줄** — 도구(serwist) 대신. 정적 청크 · 아이콘만 캐시, 문서 · RSC · API 는 손대지 않는다
