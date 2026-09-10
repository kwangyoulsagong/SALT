---
globs: apps/*/src/features/**
---

# features 레이어 (Layer 2)

## 허용 Import

- `@/shared/*` · `@/entities/*` — 허용
- `@/features/*` (다른 슬라이스) — **금지** (cross-slice)
- `@/widgets/*` · `@/pages/*` · `@/app/*` — **금지** (상위 레이어)

## 구조

```
features/{slice}/
├── model/    기능 상태 store · 액션 타입 · 상수
├── api/      mutation · 복합 액션 · SSE 구독
├── ui/       인터랙티브 컴포넌트 (이벤트 핸들러 포함)
├── lib/      기능 내부 헬퍼 · 커스텀 훅
└── index.ts
```

## 원칙

- **완결된 사용자 인터랙션 하나**를 표현한다. 슬라이스 이름에 **동사를 포함**해 의도를 드러낸다.
- `entities`의 표시 컴포넌트에 인터랙션을 입히는 역할이다.
- feature 간 공통 로직은 `shared` 또는 `entities`로 **내린다.** 두 feature가 같은 것을 필요로 하면 그건 사실 entity거나 shared다.
- 두 feature를 **함께 보여줘야** 하면 그건 `widgets`의 일이다. **feature가 feature를 부르지 않는다.**

## 우리 feature 목록

| 슬라이스 | 하는 일 | 기능 |
|---|---|---|
| `import-ledger` | CSV 업로드 · 파싱 결과 표시 · 실패 행 처리 | F001 |
| `register-exchange-key` | 조회 전용 키 등록 · 스코프 검사 결과 표시 | F001 |
| `solve-harvest` | 손실 수확 솔버 실행 · 후보 3개 표시 | F002 |
| `simulate-crypto-scenario` | 연말 시가 슬라이더 · 3열 재계산 (클라이언트) | F002 |
| `ask-coach` | 코치 대화 전송 · SSE 구독 · 스트리밍 표시 | F006 |
| `rate-recommendation` | 추천 피드백 (도움 됐음/안 됨 + 사유) | F004 |
| `run-preflight` | 주문 전 계산 (게이트 없음) | F004 |
| `complete-weekly-plan` | 이번 주 적립 완료 체크 | F003 |
| `edit-plan-settings` | 기본 적립액 · 배수 · 임계값 편집 | F003 |
| `add-goal` | 목표 저축 추가 | F000 |
| `toggle-watchlist` | 관심 종목 추가·제거 | F000 |
| `accept-invite` | 초대 코드 입력·검증 | F000 |
| `arrange-panels` | PC 이진분할 격자 배치 변경 | F006 |

## 금지된 것 — 이 제품의 제약이 features에 걸린다

- **주문을 실행하는 feature를 만들지 않는다.** `run-preflight`는 계산 표시 전용이고 게이트·차단 동작이 없다.
- **금액을 계산하는 feature를 만들지 않는다.** 예외는 `simulate-crypto-scenario` 하나 — 서버가 준 파라미터로 클라이언트에서 재계산한다(슬라이더 60fps 요구). 그 결과가 서버 계산과 **원 단위까지 일치**해야 한다.
- **낙관적 갱신은 피드백·체크 같은 비금액 상태에만** 허용한다. 금액 화면에서 금지.

## 클라이언트 재계산의 유일한 예외

`simulate-crypto-scenario`가 서버 왕복 없이 계산하는 이유는 슬라이더가 −40%~+80% 구간을 실시간으로 훑기 때문이다. 규칙:

1. 서버가 계수·세율·공제·취득가액을 응답에 담아 준다.
2. 클라이언트는 그 값으로만 계산한다. **하드코딩 상수 0건.**
3. 슬라이더를 놓으면 서버 계산과 대조해 불일치 시 서버 값으로 덮는다.
