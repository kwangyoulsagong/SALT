---
id: F019-S0-DECISION
title: "F019 순서 0 — RN 폐기 · 휴대폰 PWA /m zone 결정 · 문서 정리"
created: 2026-11-20
---

## Summary

사용자 결정(2026-11-20): RN 앱을 없애고(툴체인 무게) 휴대폰은 같은 origin `/m/*` 전용 PWA zone. 이 슬라이스는 **문서만** — 결정 · 기획 · REQ · 삭제 · 규칙.
코드 변경은 문구 한 줄(`NARROW_SCREEN_MESSAGES.prompt` "데스크톱으로 이동해 주세요").

| 산출물 | 위치 |
|---|---|
| 결정 | `requirements/decisions/ADR-012-mobile-pwa-zone.md` · `ADR-005` 표면 zone 행 |
| 기획 · 계획 | `pm/requirements/specs/in-progress/FEATURE-019-mobile-pwa.md` · `requirements/specs/in-progress/F019-mobile-pwa-global-plan.md` |
| 리서치 | `requirements/reports/research/2026-11-20-pwa-mobile-zone.md`(플랫폼 · 아키텍처 두 갈래) |
| 새 REQ | `FE-REQ-071` zone 골격 · `072` 화면 옮기기 · `073` 오프라인 · 설치 |
| 삭제 | `RN-REQ-*` 스펙 · 체크리스트 · 회고 49 · 규칙 `rn-architecture` · `rn-microfrontend` · `performance-rn` · `FEATURE-007` · `BFF-REQ-031`~`034` · `SRV-REQ-032`~`035` · `DB-REQ-025`~`028` · `FE-REQ-061` |
| 규칙 · 하네스 | 루트 · 프론트 `CLAUDE.md` · `layered-architecture` · `fsd-pages` · `fsd-shared` · `microfrontend` · `screen-mobile` · `screen-desktop` · `streaming-ssr` · `motion` · BFF `bff-architecture` · `streaming-sse` · 서버 `server-architecture` |

## 판단

1. **표면 zone 하나** — `ADR-005` "zone = 도메인"의 첫 예외. 도메인별 모바일 zone 은 하단 탭마다 문서 이동이라 앱 느낌이 깨지고 서비스 워커 주인이 애매하다
2. **basePath 를 쓰지 않는다** — 리서치 권장(`basePath '/m'`)과 다르다. 다른 zone 처럼 라우트를 `/m` 아래에 두면 운영 공용 `/_next`(규칙 7) · 합치기 스크립트를 그대로 쓴다
3. **공개 `/tips` 는 `/m` 에 두지 않는다** — 분리 URL 의 canonical 쌍을 영구 관리하지 않게
4. done · 리포트 폴더의 옛 RN 언급은 기록으로 둔다 — 지운 문서는 이 커밋에서 되살린다
5. 앱 웹뷰 코드(`SALTApp/` · `IN_APP_WEBVIEW` · `appType`)는 이 PR 에서 지우지 않는다 — 옮길 원본이다(`FE-REQ-072`)
