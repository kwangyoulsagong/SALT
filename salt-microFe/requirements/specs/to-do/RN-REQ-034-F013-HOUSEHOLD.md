---
id: RN-REQ-034
feature: F013
area: rn
kind: UI
title: "가계부 탭(네이티브) — 3초 입력 · 공유 시트로 결제 문자 보내기 · 오프라인 큐"
priority: high
created: 2026-10-30
source: pm/requirements/specs/in-progress/FEATURE-013-household-budget.md
---

## Summary

가계부 입력이 네이티브여야 하는 이유: 숫자 키패드로 금액 먼저, 그리고 결제 문자를 **사용자가 공유 시트로 앱에 보내는 것**(문자 읽기 권한 요청 0 — 연동이 아니다).

## FR

| FR | 내용 | FEATURE-013 |
|---|---|---|
| FR-1 | 빠른 입력 — 앱 열면 금액 키패드 · 최근 항목 칩 · 저장. 3탭 이내 | FR-1 |
| FR-2 | 공유 시트 — Android 공유 인텐트(`text/plain`) · iOS 공유 확장. 받은 텍스트 → `parse` → 후보 목록. 원문은 메모리에서만, 디스크 · 로그 0 | FR-3 |
| FR-3 | SMS 읽기 권한 · 알림 접근 권한 요청 0(스토어 심사 문서에도 명시) | 정책 |
| FR-4 | 오프라인 큐 — 저장 실패 시 로컬 큐(암호화 저장소) · 연결되면 재전송 · 중복 방지 키 | UX Loading |
| FR-5 | 목표 시계 한 줄 · 봉투 잔액 갱신 | FR-8 |
| FR-6 | 반복 템플릿 확인 · 대략 합계 | FR-4 · 5 |
| FR-7 | 월 화면 · 리뷰는 웹뷰 가능(`RN-REQ-032` FR-3 경계 안에서 결정) | FR-7 · 9 |

## Acceptance Criteria

- [ ] 권한 목록에 SMS · 알림 접근 0
- [ ] 공유 원문이 앱 저장소 · 로그 0
- [ ] 비행기 모드 저장 → 복귀 후 1건만 저장

## Changelog

| 날짜 | 변경 |
|---|---|
| 2026-10-30 | 신규(to-do) |
