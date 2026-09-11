---
globs: apps/*/src/entities/**
---

# entities 레이어 (Layer 1)

## 허용 Import

- `@/shared/*` — 허용
- `@/entities/*` (다른 슬라이스) — **금지** (cross-slice)
- `@/features/*` · `@/widgets/*` · `@/pages/*` · `@/app/*` — **금지** (상위 레이어)

## 구조

```
entities/{slice}/
├── model/    타입 · enum · 상수 · store · selectors · messages(이 슬라이스의 문구)
├── api/      조회 서비스 + query 훅 (읽기 중심)
├── ui/       표시 전용 컴포넌트 — 이벤트 핸들러를 안에서 부르지 않는다
├── lib/      이 엔티티 전용 헬퍼 · 매퍼 · 포맷터
└── index.ts
```

## 원칙

- 도메인의 자기 완결적 데이터 단위를 표현한다. 슬라이스 이름은 `layered-architecture.md` §4 레지스트리를 따른다.
- **`ui/`는 순수 표시용이다.** 이벤트 핸들러는 prop으로 받되 그 안에서 mutation을 부르지 않는다. `entities/portfolio/ui/HoldingRow.tsx`는 `onSelect`를 받고 호출만 한다.
- **`api/`에는 조회(query)만 둔다.** mutation은 `features/{slice}/api/`로 올린다.
- 엔티티 간 공통 로직이 필요하면 `shared`로 내린다. **cross-slice import로 해결하지 않는다.**
- 서버에는 1:1 대응 레이어가 없다. 서버는 표준 DDD를 쓰고 레이어 이름이 다르다.
- **store 셀렉터는 자기 가지만 타이핑한다.** `RootState`는 `app` 레이어의 것이라 슬라이스가
  그것을 보면 위로 향하는 의존이 된다. `useSelector((state: AuthRootState) => state.auth)`.
- **`ui/`가 barrel로 노출되면 상호작용 잎에 `"use client"`를 직접 붙인다.** 부모의 경계에
  기대면 barrel을 서버 컴포넌트가 import하는 순간 경계가 사라진다.

## 우리 엔티티가 서로를 부르고 싶어지는 자리 — 미리 정한다

| 상황 | 잘못된 해결 | 맞는 해결 |
|---|---|---|
| 청구서가 가격 이력을 쓴다 | `entities/invoice` → `entities/market` | 서버가 이미 합쳐서 준다. BFF 뷰모델을 쓴다 |
| 세금이 보유 수량을 쓴다 | `entities/tax` → `entities/portfolio` | 동일. `tax/cockpit` 응답에 들어 있다 |
| 코치 카드가 실패 이력을 쓴다 | `entities/coach` → `entities/indicator` | 동일. `failureCases`가 응답 필드다 |
| 자산군 enum을 여럿이 쓴다 | 각자 정의 | `shared/model`에 한 번 |
| 금액·퍼센트 포맷 | 각자 정의 | `shared/lib` |

**서버가 합쳐서 주는 것을 프론트에서 다시 합치지 않는다.** BFF가 뷰모델을 소유하는 이유가 이것이다.

## 표시 전용의 실제 의미

```tsx
// ✅ entities/coach/ui/RecommendationCard.tsx — 표시만
export function RecommendationCard({ data, onWhy }: Props) {
  if (!data.renderable) return <BlockedNotice reason={data.blockedReason} />;
  return (
    <Card>
      <ActionBadge action={data.action} />
      <ScoreText score={data.score} note={data.scoreNote} />
      <TextButton onClick={onWhy}>근거 보기</TextButton>
    </Card>
  );
}
```

- **3종 세트 렌더 게이트(`renderable`)는 표시 규칙이므로 여기 있다.** 판정은 서버가 하고, 엔티티는 그 결과를 존중한다.
- `onWhy` 안에서 API를 부르지 않는다. 부르는 것은 `features/ask-coach`다.
