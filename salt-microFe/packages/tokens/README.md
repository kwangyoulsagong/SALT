# `@repo/tokens`

플랫폼 중립 디자인 토큰. **순수 TypeScript 객체 하나**만 export한다 (FE-REQ-007 FR-30).

```ts
import { tokens } from "@repo/tokens";
```

## 규칙

- **`@vanilla-extract/css`를 import하지 않는다.** import하는 순간 React Native에서 쓸 수 없게 된다.
- 값은 여기서만 바꾼다. 어댑터(`@repo/ui`, `@repo/ui-native`)는 값을 재정의하지 않는다.

## 어댑터

| 플랫폼 | 어댑터 | 하는 일 |
|---|---|---|
| 웹 | `@repo/ui` (`src/styles/tokens.css.ts`) | `createGlobalTheme(":root", tokens)` → CSS 변수 |
| 모바일 | `@repo/ui-native` (RN-REQ-001) | `StyleSheet` 값으로 직접 사용 |
