# Investment Coach Global Plan

## Scope

SALT 수익 목표형 투자 코치 기능을 PM, 프론트엔드, BFF, 서버가 같은 요구사항 흐름으로 진행하기 위한 글로벌 계획이다.

## Source Specs

| Area | Document | Purpose |
|---|---|---|
| PM | `pm/requirements/specs/done/investment-new-feature-plan.md` | 제품 목표, UX 흐름, 정책, 수용 기준 |
| Frontend | `salt-microFe/requirements/specs/done/` | 화면/상태/API 연동 요구사항 |
| BFF | `bff/requirements/specs/done/BFF-REQ-001.md` | AI Coach 화면 계약 |
| BFF | `bff/requirements/specs/done/BFF-REQ-002.md` | 외부 주문 전 체크 화면 계약 |
| BFF | `bff/requirements/specs/done/BFF-REQ-003.md` | 행동 코치 화면 계약 |
| BFF | `bff/requirements/specs/done/BFF-REQ-004.md` | 익절/손절 플랜 화면 계약 |
| BFF | `bff/requirements/specs/done/BFF-REQ-005.md` | 신호 성과 화면 계약 |
| Backend | `salt-server/requirements/specs/done/SRV-REQ-001.md` | AI Coach 점수 기반 판단 |
| Backend | `salt-server/requirements/specs/done/SRV-REQ-002.md` | 외부 주문 전 체크 |
| Backend | `salt-server/requirements/specs/done/SRV-REQ-003.md` | 행동 코치 |
| Backend | `salt-server/requirements/specs/done/SRV-REQ-004.md` | 익절/손절 플랜 |
| Backend | `salt-server/requirements/specs/done/SRV-REQ-005.md` | 신호 성과 추적 |

## Execution Order

1. PM spec에서 사용자 흐름과 정책을 확정한다.
2. 서버 spec에서 raw API 계약과 데이터 계산 책임을 확정한다.
3. BFF spec에서 프론트 화면 view model 계약을 확정한다.
4. 프론트 spec에서 화면 상태, API 호출, 빈/로딩/에러 상태를 확정한다.
5. 루트 checklist에서 전체 계약 정합성을 검증한다.

## Global Acceptance

- PM, BFF, 서버 문서가 같은 feature scope를 설명한다.
- BFF response contract는 서버 API로 구성 가능해야 한다.
- 프론트 요구사항은 BFF response contract와 충돌하지 않아야 한다.
- 주문 실행, 자동매매, 국내 주식 실시간 API는 별도 PoC 전까지 범위 밖으로 유지한다.
