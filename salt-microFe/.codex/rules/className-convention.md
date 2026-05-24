# className 작성 규칙

## 조건부 클래스

템플릿 리터럴에서 `cond && 'class'`를 쓰지 않는다. false 문자열이 들어갈 수 있다.

```tsx
<div className={`px-4 ${isActive ? 'bg-blue' : ''}`} />
```

## base class

- 항상 필요한 layout class는 조건부 밖에 둔다.
- `flex-1`, `h-full`, `w-full`, `overflow-hidden` 같은 골격 class를 상태 분기 안에 넣지 않는다.

## 복잡한 조합

- 조건이 3개 이상이면 class 조합 유틸 도입 또는 variant 함수로 분리한다.
- 중복 class가 반복되면 Vanilla Extract recipe 또는 컴포넌트 variant를 검토한다.

## 금지

- 알 수 없는 문자열 concat으로 token을 동적 생성하지 않는다.
- Tailwind류 동적 class가 빌드에서 누락되는 패턴을 피한다.
- shell global class로 remote 내부 class를 제어하지 않는다.
