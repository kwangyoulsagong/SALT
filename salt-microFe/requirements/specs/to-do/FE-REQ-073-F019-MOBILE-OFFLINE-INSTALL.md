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

## FR

| FR | 내용 |
|---|---|
| FR-1 | 화면마다(홈 · 저축 · 가계부) 마지막 성공 응답의 표시용 값 한 벌 + `fetchedAt` — 키 = 사용자 id. 다른 사용자 · 로그아웃이면 그 자리에서 지운다 |
| FR-2 | 오프라인 · 받기 실패면 한 벌을 그리고 "오프라인 · HH:MM 기준" 띠. 한 벌도 없으면 오프라인 한 장 |
| FR-3 | 쓰기(지출 적기 · 넣기)는 오프라인이면 버튼을 막고 이유 한 줄 — 큐 0 · 낙관적 갱신 0 |
| FR-4 | 설치 안내 — iOS 는 공유 → 홈 화면에 추가 그림 한 장, Android 는 `beforeinstallprompt`. 첫 진입에 띄우지 않고(설정 · 알림 켜기 자리) · 닫으면 다시 안 뜸 · standalone 이면 0 |

## 검증

- Playwright `context.setOffline` · 로그아웃 뒤 IndexedDB 0 · 다른 계정 로그인 뒤 앞 계정 숫자 0

## Changelog

| 날짜 | 변경 |
|---|---|
| 2026-11-20 | 신규(to-do) — `ADR-012` 순서 3 |
