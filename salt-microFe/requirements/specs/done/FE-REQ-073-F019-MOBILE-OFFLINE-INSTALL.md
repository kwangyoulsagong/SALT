---
id: FE-REQ-073
feature: F019
area: frontend
kind: FUNC
title: "휴대폰 PWA 오프라인 마지막 화면 · 설치 안내"
priority: medium
created: 2026-11-20
source: 사용자 "마지막 화면 한 벌만" · ADR-012
---

## Summary

`ADR-012` 순서 3. 서비스 워커 캐시가 아니라 **화면 숫자 한 벌**을 IndexedDB 에 — Cache API 는 캐시 헤더를 무시하고 만료가 없다(리서치 §1).
담는 것은 API 응답이 아니라 **화면이 보인 표시용 글자**(제목 · 이름 · 값)다 — 계산 0.

**불변식: 그 사용자의 한 벌만 그린다.** 지금 세션 사용자가 없거나 다르면 아무것도 그리지 않고, 로그아웃 · 세션 죽음 · 새 로그인에 그 자리에서 지운다.

## FR

| FR | 내용 |
|---|---|
| FR-1 | 화면마다(홈 · 저축 · 가계부) 마지막 성공 응답의 표시용 값 한 벌 + `fetchedAt` — 키 = 화면, 행마다 사용자 id. 다른 사용자 행이 있으면 저장 전에 통째로 비운다 · 로그아웃 · 세션 죽음(`clearSession`) · 새 로그인(`SignInForm`)이면 그 자리에서 지운다. 구역당 행 20 상한 |
| FR-2 | 오프라인 문서 이동 · 탭 누름 → 서비스 워커의 오프라인 한 장이 그 경로의 한 벌을 그리고 "오프라인 · HH:MM 기준" 띠(서울 시각, 오늘이 아니면 날짜) + 다른 한 벌로 가는 링크 셋 · 다시 시도. 연결은 됐는데 받기 실패면 화면 안에서 한 벌 + "불러오지 못했어요 · HH:MM 기준"(오프라인이 아닌데 "오프라인"이라 쓰지 않는다). 한 벌도 없으면 원래 오프라인 한 장 · 원래 실패 문구 |
| FR-3 | 쓰기(지출 적기 · 넣기 — `MobileSheetAction`)는 오프라인이면 버튼을 막고 이유 한 줄 · 시트가 열린 채 끊기면 안 입력 · 제출을 `fieldset disabled` 로 — 큐 0 · 낙관적 갱신 0 |
| FR-4 | 설치 안내 카드 — 홈 맨 아래 설정 자리. iOS 는 공유 → 홈 화면에 추가 그림 한 장(시트 · `Illustration` `addToHome`), Android 는 `beforeinstallprompt` 를 받았을 때만(루트 레이아웃이 먼저 붙잡는다). 첫 진입엔 0("봤음"만 기록) · 닫으면 다시 안 뜸 · standalone 이면 0 · 둘 다 아닌 브라우저 0. 몸통(시트 · 모션 그림)은 보일 때만 받는 청크 |

## 하지 않는 것

- 투자 탭 · 상세 화면의 한 벌 — 시세는 지난 값이 오히려 틀린 정보다
- 오프라인 쓰기 큐 · API 응답 통째 캐시 · Background Sync

## 검증

- Playwright `context.setOffline` · 로그아웃 뒤 IndexedDB 0 · 다른 계정 로그인 뒤 앞 계정 숫자 0
- **서비스 워커가 문서를 쥔 페이지에서 `setOffline` 은 워커의 요청을 끊지 않는다** — `PW_EXPERIMENTAL_SERVICE_WORKER_NETWORK_EVENTS=1` 로 돌린다(없으면 서버가 응답해 오프라인 한 장이 안 나온다, 2026-11-21 실측)

## Changelog

| 날짜 | 변경 |
|---|---|
| 2026-11-20 | 신규(to-do) — `ADR-012` 순서 3 |
| 2026-11-21 | **done**(`feat/fe-req-073-mobile-offline-install`) — FR-1~4. 계약 `@repo/core/mobile` `offline.ts`(DB 이름 · 화면 키 · `offlineRecordFor` 사용자 일치 · 서울 시각 글자) · 저장소 `@repo/web-shared/lib` `offlineSnapshot`(지우기는 `clearSession` 한 곳 + 로그인) · 오프라인 한 장 인라인 스크립트(`offlinePage.ts` — `textContent` 만) · 화면 대체 `MobileOfflineFallback` · 쓰기 막기 `useOnline` · 설치 카드(판정 / 몸통 청크 나눔 — 홈 첫 로드 main 117 → 122 kB). FR-2 띠를 두 갈래로(받기 실패는 "불러오지 못했어요"), FR-4 위치를 "설정 · 알림 켜기 자리" → 홈 맨 아래 설정 알약 위(휴대폰 설정 화면이 없다). 루트 `requirements/specs/done/F019-s3-mobile-offline-install-slice.md` |
