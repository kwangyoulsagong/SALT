---
id: BFF-REQ-005
title: Investment Coach BFF > 신호 성과 화면 계약
priority: medium
labels: [API 연동, 계약 정의]
created: 2026-05-25
---

## Summary

BFF는 서버 signal performance 결과를 프론트 성과 카드용 metrics/samples 계약으로 변환한다.

## Background

AI 코치의 판단 품질을 추적하려면 과거 신호의 승률, 평균 수익률, 최대 낙폭, 샘플이 필요하다. 프론트는 서버 계산 결과를 별도 가공 없이 렌더링할 수 있어야 한다.

## Requirements

- `GET /api/app/signal-performance`는 인증 토큰을 서버에 전달하고 `/signal-performance`를 호출한다.
- `symbol`, `signalKey` query를 서버에 전달한다.
- 응답은 `status`, `metrics`, `samples`, `generatedAt`을 포함한다.
- `metrics`는 `sampleCount`, `winRate`, `avgReturn`, `maxDrawdown`을 포함한다.

## Acceptance Criteria

- [ ] BFF route가 `/api/app/signal-performance`에 등록된다.
- [ ] query string은 `URLSearchParams`로 구성된다.
- [ ] 서버 통계 필드가 `metrics` 객체로 묶인다.
- [ ] 샘플이 없을 때도 `status`와 null metric을 전달할 수 있다.

## Notes

- 구현 위치: `bff/src/rest/routes/signal-performance.routes.ts`, `bff/src/rest/controllers/signal-performance.controller.ts`, `bff/src/services/app-signal-performance.service.ts`
