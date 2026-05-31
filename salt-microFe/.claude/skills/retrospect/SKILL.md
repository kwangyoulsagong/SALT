---
name: retrospect
description: "Phase 5: 구현 품질을 리뷰하고 개선점을 기록한다"
---

# Phase 5: Retrospect

## 컨텍스트

!`git diff --stat -- salt-microFe/`
!`find salt-microFe/apps salt-microFe/packages -maxdepth 3 -type f \( -name '*.ts' -o -name '*.tsx' \) | wc -l`

## 리뷰 관점

- 도메인 경계가 명확한가.
- route 파일이 과도하게 커지지 않았는가.
- app 간 직접 import가 없는가.
- shared package에 app-specific 코드가 들어가지 않았는가.
- API/query key/cache invalidation이 일관적인가.
- SSR/hydration 위험이 없는가.
- MFE expose/remotes 계약이 깨지지 않았는가.
- 성능상 불필요한 렌더, 대형 번들, 메모리 누수가 없는가.
- a11y와 fallback이 충분한가.

## 보고 형식

```text
## Retrospective Report

### 잘된 점
- 항목

### 개선 필요
- 파일 — 문제 — 개선 방안

### Action Items
- [ ] 작업 — 우선순위 high/medium/low

### Quality Score
| 항목 | 점수 |
|---|---|
| 도메인 경계 | X/5 |
| 타입 안전성 | X/5 |
| SSR/MFE 안정성 | X/5 |
| 성능 | X/5 |
```

요구사항 번호가 있으면 `requirements/reports/retrospects/REQ-{번호}.md`에 저장한다.
