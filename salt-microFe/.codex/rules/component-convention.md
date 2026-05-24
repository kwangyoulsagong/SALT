# 컴포넌트 개발 규칙

## 우선순위

- 기존 `@repo/ui` 컴포넌트를 먼저 확인한다.
- 앱 전용 UI는 해당 앱의 `src/components` 또는 `src/component`에 둔다.
- 특정 도메인 전용 UI는 `src/domains/{domain}/components`에 둔다.
- 두 앱 이상에서 재사용되면 `packages/ui`로 승격한다.

## 파일/네이밍

- 파일명과 컴포넌트명은 PascalCase.
- Props는 `{ComponentName}Props` interface.
- named export만 사용한다. `export default`는 Next `pages` 파일 외에는 피한다.
- 한 파일에는 export 컴포넌트 하나를 기본으로 한다. 작은 private helper 컴포넌트는 같은 파일 허용.

## Props

- `any` 금지. 외부 응답 경계에서는 `unknown` + 타입 가드 또는 명시 DTO 사용.
- boolean prop은 의미가 드러나게 짓는다. 예: `isOpen`, `disabled`, `hasError`.
- optional prop 기본값은 구조 분해에서 지정한다.
- business rule을 UI props로 과도하게 노출하지 않는다.

## 구조

```text
components/
  AssetCard/
    AssetCard.tsx
    AssetCard.css.ts
    index.ts
```

- 복합 컴포넌트는 폴더로 분리하고 `index.ts`에서 public export만 연다.
- JSX 분기가 커지면 render helper 함수가 아니라 하위 컴포넌트로 분리한다.
- route 파일은 page composition만 담당하고 UI 세부 구현은 컴포넌트로 내린다.

## 스타일

- 재사용 스타일은 Vanilla Extract를 우선한다.
- 일회성 layout은 기존 코드 스타일을 따른다.
- 정적 색상/폰트/간격은 token 또는 기존 `@repo/ui` 패턴을 먼저 확인한다.
- 동적 계산값만 inline style을 허용한다.

## Ref

- `forwardRef`는 실제 DOM 접근 또는 imperative handle이 필요할 때만 사용한다.
- `forwardRef` 사용 시 `displayName`을 지정한다.

## 금지

- 컴포넌트 안에 API 호출 세부 구현 직접 작성 금지. hook/service로 분리.
- shared UI에 app store, app router, app API 의존 금지.
- SSR 가능한 컴포넌트에서 render 중 browser API 접근 금지.
