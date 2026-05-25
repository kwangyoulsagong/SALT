---
id: SRV-REQ-003
title: Investment Coach Server > 행동 코치
priority: medium
labels: [기능 정의, API 연동]
created: 2026-05-25
---

## Summary

서버는 사용자 거래 내역을 기반으로 행동 분석 insight를 생성하고 행동 코치 응답을 제공한다.

## Background

투자 손실은 종목 판단보다 반복 행동 패턴에서 발생할 수 있다. 행동 코치는 과매매, 패닉셀, 추격매수 같은 패턴을 감지하고 사용자에게 실행 가능한 규칙을 제시해야 한다.

## Requirements

- `GET /api/behavior-coach`는 인증 사용자 기준으로 동작한다.
- 호출 시 `BehaviorAnalysisService.generateBehaviorAnalysis(userId)`를 실행한다.
- 거래 수가 3건 미만이면 `insufficient_data` 상태와 기본 추천 규칙을 반환한다.
- 충분한 데이터가 있으면 활성 insight를 severity/createdAt 기준으로 조회한다.
- 응답은 `status`, `tags`, `warnings`, `recommendedRules`, `evidence`를 포함한다.

## Acceptance Criteria

- [ ] route가 `/api/behavior-coach`에 등록된다.
- [ ] 사용자별 데이터 query에 `userId` 조건이 포함된다.
- [ ] 데이터 부족 상태와 active/stable 상태를 구분한다.
- [ ] warnings는 insight id/title/summary/severity/confidence/payload를 포함한다.
- [ ] recommendedRules는 감지된 tag에 맞춰 생성된다.

## Notes

- 구현 위치: `salt-server/src/modules/behavior-coach/**`, `salt-server/src/modules/investment-insight/behavior-analysis.service.ts`
