---
id: GLOBAL-F019-MOBILE-PWA
title: "F019 휴대폰 PWA — 같은 origin /m/* 전용 zone 전 영역 계획"
priority: high
labels: [F019, fe, pwa, mobile]
created: 2026-11-20
---

## Summary

사용자 결정(2026-11-20) — React Native 앱을 접고 휴대폰은 PWA. 전용 zone · 데스크톱과 다른 URL(`/m/*`). 이유는 네이티브 툴체인 무게.
이 계획이 §4-1 순위 6(옛 "모바일 F007 RN")을 대체한다.

| 읽을 것 | 위치 |
|---|---|
| 결정 | `requirements/decisions/ADR-012-mobile-pwa-zone.md` |
| 기획서 | `pm/requirements/specs/in-progress/FEATURE-019-mobile-pwa.md` |
| 리서치 | `requirements/reports/research/2026-11-20-pwa-mobile-zone.md` |

## 순서

| 순서 | 몫 | REQ | 영역 |
|---|---|---|---|
| 0 | 결정 · 기획 · RN 문서 삭제 · 규칙 정리(이 PR) | — | 문서 |
| 1 | zone 골격 · 매니페스트 · 서비스 워커 · 하단 탭 · `/m/login` · 데스크톱 → `/m` 이동 — **done 2026-11-20**(`F019-s1-mobile-zone-slice.md`) | `FE-REQ-071` | FE |
| 2 | 화면 옮기기(홈 · 저축 · 가계부 · 투자 상세) · 웹뷰 계약 걷기 — **done 2026-11-20**(`F019-s2-mobile-screens-slice.md`) | `FE-REQ-072` | FE |
| 2b | 탭 · 상세 안쪽을 홈 수준으로(금액 카드 · 아이콘 판 · 흰 섹션) — **done 2026-11-20**(`F019-s2b-mobile-interiors-slice.md`) | `FE-REQ-074` | FE |
| 3 | 오프라인 마지막 화면 · 설치 안내 — **done 2026-11-21**(`F019-s3-mobile-offline-install-slice.md`) | `FE-REQ-073` | FE |
| 3b | 휴대폰 배터리 — 숨은 화면 소켓 쉼 · 흐림 측정 — **done 2026-11-21**(`F019-s3b-mobile-battery-slice.md`, 순서 3 과 한 PR) | `FE-REQ-077` | FE |
| 4 | 웹 푸시(구독 · 발송 · 알림 누름) | 착수 때 — 서버 · BFF · DB · FE | 전 영역 |

순서 1~3 은 서버 · BFF 변경 0(같은 계약 · 같은 쿠키).

## 하지 않는 것

- 공개 `/tips` 의 `/m` 사본(한 URL 반응형)
- 네이티브 앱 · 앱 스토어 · 앱 웹뷰
- 오프라인 쓰기 큐 · API 응답 통째 캐시
