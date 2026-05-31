---
id: BFF-REQ-001
title: Investment Coach BFF > AI Coach 화면 계약
priority: high
labels: [API 연동, 계약 정의, 기능 정의]
created: 2026-05-25
---

## Summary

BFF는 서버 AI Coach 응답을 프론트가 바로 쓰는 preview/detail/profile/feedback/explain view model로 변환한다.

## Background

프론트는 서버 raw payload가 아니라 사이드 프리뷰, 상세 카드, 프로필 설정, 피드백 기록, Gemini 해설에 맞춘 화면 계약이 필요하다. 특히 서버의 판단 점수 `score`는 프론트 decision card에 그대로 노출 가능한 필드로 전달되어야 한다.

## Requirements

- `GET /api/app/ai-coach/preview`는 인증 토큰을 서버에 전달하고 `/ai-coach?symbol=&preview=true`를 호출한다.
- `GET /api/app/ai-coach/detail`은 `/ai-coach?symbol=&mode=`와 `/market-intelligence/:symbol/news?limit=3`를 조합한다.
- preview/detail decision card는 `mode`, `label`, `action`, `confidence`, `riskLevel`, `timeframe`, `headline`, `reasons`, `risks`, `score`를 포함한다.
- `GET/PATCH /api/app/ai-coach/profile`은 서버 프로필을 화면 설정 모델로 변환한다.
- `POST /api/app/ai-coach/feedback`은 서버 피드백 결과를 `{ id, symbol, recordedAt, status }`로 변환한다.
- `POST /api/app/ai-coach/explain`은 프로토타입 public endpoint로 서버 public explainer에 위임한다.
- 주문 실행, 주문 ID, 거래소 deep link, 자동매매 필드는 응답에 포함하지 않는다.

## Acceptance Criteria

- [ ] preview response에 `decisions.scalp.score`와 `decisions.longTerm.score`가 포함된다.
- [ ] detail response의 `decisionCards[]`에도 `score`가 포함된다.
- [ ] profile, feedback, explain route가 AI Coach app route에 등록되어 있다.
- [ ] 인증이 필요한 route는 `authMiddleware` 뒤에 있다.
- [ ] explain route에는 운영 전 auth/rate-limit TODO가 남아 있다.

## Notes

- 구현 위치: `bff/src/rest/routes/ai-coach.routes.ts`, `bff/src/rest/controllers/ai-coach.controller.ts`, `bff/src/services/app-ai-coach.service.ts`
