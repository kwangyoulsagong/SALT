---
id: SRV-REQ-005
title: Investment Coach Server > 신호 성과 추적
priority: medium
labels: [기능 정의, API 연동]
created: 2026-05-25
---

## Summary

서버는 AI Coach insight와 가격 이력을 비교해 신호 성과 metrics를 계산한다.

## Background

AI 코치 판단의 품질을 개선하려면 과거 신호가 이후 가격 흐름에서 어떤 성과를 냈는지 추적해야 한다. 서버는 샘플 수, 승률, 평균 수익률, 최대 낙폭을 반환해야 한다.

## Requirements

- `GET /api/signal-performance`는 인증 사용자 기준으로 동작한다.
- optional `symbol`, `signalKey` query를 지원한다.
- 최근 AI Coach insight 최대 100건을 기준으로 성과 샘플을 만든다.
- 각 insight의 생성 이후 첫 가격과 최신 가격을 비교해 `returnRate`와 `win`을 계산한다.
- 응답은 `status`, `sampleCount`, `winRate`, `avgReturn`, `maxDrawdown`, `samples`, `generatedAt`을 포함한다.

## Acceptance Criteria

- [ ] route가 `/api/signal-performance`에 등록된다.
- [ ] 사용자별 insight query에 `userId`와 `type: ai_coach`가 포함된다.
- [ ] feedback insight는 성과 샘플에서 제외된다.
- [ ] 샘플은 최대 20개만 응답한다.
- [ ] 데이터가 부족하면 `status: insufficient_data`를 반환한다.

## Notes

- 구현 위치: `salt-server/src/modules/signal-performance/**`
