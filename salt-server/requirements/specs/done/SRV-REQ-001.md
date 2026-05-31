---
id: SRV-REQ-001
title: Investment Coach Server > AI Coach 점수 기반 판단
priority: high
labels: [기능 정의, API 연동, 계약 정의]
created: 2026-05-25
---

## Summary

서버는 AI Coach 후보를 점수화하고 preview/detail/profile/feedback/explain API를 제공한다.

## Background

투자 코치의 핵심은 단순 문장 추천이 아니라 후보별 근거와 리스크를 점수로 비교하는 것이다. 점수는 서버에서 계산되어 BFF와 프론트로 전달되어야 하며, 주문 실행으로 오해될 필드는 만들지 않아야 한다.

## Requirements

- `GET /api/ai-coach`는 `symbol`, `mode`, `preview` query를 지원한다.
- `POST /api/ai-coach/generate`는 후보를 생성하고 `AICoachScoreEngine`으로 후보별 `score`를 계산한다.
- coach payload는 `recommendation.score`, `candidates[].score`, `debug.topCandidateFactors[]`를 포함한다.
- symbol coach의 mode decision과 dual decision은 프론트가 쓸 수 있는 `score`를 포함해야 한다.
- `GET/PATCH /api/ai-coach/profile`은 사용자 투자 성향과 리스크 한도를 조회/저장한다.
- `POST /api/ai-coach/feedback`은 사용자 피드백을 `InvestmentInsight`로 기록하되 주문 실행은 하지 않는다.
- `POST /api/ai-coach/explain`은 public prototype endpoint로 Gemini 해설을 생성하고 운영 전 auth/rate-limit TODO를 남긴다.

## Acceptance Criteria

- [ ] AI Coach route가 `/api/ai-coach`에 등록된다.
- [ ] 인증 route는 `authMiddleware` 뒤에 있다.
- [ ] DTO 검증은 Zod schema로 수행된다.
- [ ] score는 recommendation/candidates/decision contract에서 추적 가능하다.
- [ ] 피드백 payload는 `kind: coach_feedback`으로 저장된다.
- [ ] 주문 실행 객체, 주문 상태, 주문 ID를 생성하지 않는다.

## Notes

- 구현 위치: `salt-server/src/modules/investment-insight/ai-coach/**`, `salt-server/src/modules/investment-insight/ai-investment-coach.service.ts`
