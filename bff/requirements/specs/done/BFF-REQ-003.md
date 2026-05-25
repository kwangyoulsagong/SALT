---
id: BFF-REQ-003
title: Investment Coach BFF > 행동 코치 화면 계약
priority: medium
labels: [API 연동, 계약 정의]
created: 2026-05-25
---

## Summary

BFF는 서버 행동 분석 결과를 사용자 행동 코치 카드와 추천 규칙 목록으로 변환한다.

## Background

투자 코치 UX는 종목 판단뿐 아니라 사용자의 반복 손실 패턴과 감정적 거래 위험을 알려줘야 한다. 프론트는 서버 insight raw payload보다 카드 중심의 view model이 필요하다.

## Requirements

- `GET /api/app/behavior-coach`는 인증 토큰을 서버에 전달하고 `/behavior-coach`를 호출한다.
- 응답은 `status`, `tags`, `cards`, `recommendedRules`, `evidence`를 포함한다.
- `warnings[]`는 `cards[]`로 변환한다.
- 서버 severity가 80 이상이면 UI severity를 `danger`, 그 외에는 `warning`으로 변환한다.

## Acceptance Criteria

- [ ] BFF route가 `/api/app/behavior-coach`에 등록된다.
- [ ] 카드에는 `id`, `title`, `message`, `severity`, `confidence`가 포함된다.
- [ ] 거래 데이터 부족 상태도 `status`와 `recommendedRules`로 표현된다.
- [ ] controller는 service 호출과 envelope 응답만 담당한다.

## Notes

- 구현 위치: `bff/src/rest/routes/behavior-coach.routes.ts`, `bff/src/rest/controllers/behavior-coach.controller.ts`, `bff/src/services/app-behavior-coach.service.ts`
