---
id: FE-REQ-043
feature: F007
area: fe
kind: UI
title: "웹은 PC 화면 — 768px 미만이면 '더 큰 화면으로' 안내 한 장(스크린샷 · PC 링크 복사)"
priority: medium
created: 2026-09-30
source: 사용자 결정 2026-09-30 — 휴대폰 화면은 RN 앱(`RN-REQ-001`)이 맡고, 웹은 좁은 화면에서 PC 접속을 안내한다
---

## Summary

웹 화면은 PC 배치(시세 표 + 우측 패널 · 2열 카드)다. 360 폭을 한 줄씩 맞추는 비용(필터 줄 · 표 · 카드)이 끝없이 나오는데,
휴대폰 화면은 앱이 따로 만든다. 그래서 **768px 미만이면 모든 라우트 대신 안내 한 장**을 보인다 — 참고한 국내 증권 웹과 같은 방식:
위 옅은 그라데이션 · 서비스 이름 · 두 줄 제목 · 모니터 안 PC 스크린샷 · 회색 카드(두 번째 스크린샷) · "PC로 접속해 주세요" + 링크 복사.

## FR

| FR | 내용 | 상태 |
|---|---|---|
| FR-1 | `AppShell` 이 본문과 `NarrowScreenNotice` 를 같이 렌더하고 **CSS 미디어 쿼리로만** 가른다(`max-width: 767px`). 서버는 폭을 모르므로 JS 분기 금지(하이드레이션 · 깜빡임) | 완료 |
| FR-2 | 문구 `NARROW_SCREEN_MESSAGES`(`shared/i18n`) — "거래"라고 쓰지 않는다(주문 실행 없음). 휴대폰 그림 없음(앱 전) | 완료 |
| FR-3 | 스크린샷 두 장 `public/narrow-screen/{investments,detail}.webp` — 고정 데이터 1440 × 900. `next/image` lazy — 넓은 화면(`display: none`)에서는 받지 않는다 | 완료 |
| FR-4 | [PC 링크 복사하기] — 지금 주소를 클립보드로, 결과 한 줄 `aria-live`. 실패하면 주소창 복사 안내 | 완료 |
| FR-5 | 버튼 흰 글자 AA — `action.hover`(4.84:1). `action.primary`(3.92:1) 는 쓰지 않는다 | 완료 |

## 하지 않는 것

- 좁은 화면용 반응형 배치(앱이 맡는다) · 앱 설치 링크 · QR(앱 전)
- `web-tax` zone(`/tax`) — 세금 기능은 빠졌다(`ADR-002`), 존폐 열린 질문

## Changelog

- 2026-09-30: 초판 · FR-1~5
