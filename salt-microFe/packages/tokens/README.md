# `@repo/tokens`

플랫폼 중립 디자인 토큰. **순수 TypeScript 객체 하나**만 export한다 (FE-REQ-007 FR-30).

```ts
import { tokens } from "@repo/tokens";
```

## 규칙

- **`@vanilla-extract/css`를 import하지 않는다.** import하는 순간 CSS 밖(아이콘 생성 스크립트 · 서비스 워커 등)에서 쓸 수 없게 된다.
- 값은 여기서만 바꾼다. 어댑터(`@repo/ui`)는 값을 재정의하지 않는다.

## 어댑터

| 플랫폼 | 어댑터 | 하는 일 |
|---|---|---|
| 웹 | `@repo/ui` (`src/styles/tokens.css.ts`) | `createGlobalTheme(":root", tokens)` → CSS 변수 |
