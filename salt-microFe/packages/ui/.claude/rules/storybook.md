# Storybook 작성 규칙

이 규칙은 `salt-microFe/packages/ui/src/**/*.stories.tsx` 작업에 적용한다. 새 재사용 컴포넌트나 의미 있는 variant를 추가하면 Storybook story를 함께 추가한다.

## 파일 위치

- story 파일은 컴포넌트 구현 파일 옆에 둔다.
- 파일명은 `<Component>.stories.tsx`를 사용한다.
- 컴포넌트가 하위 조합을 export하더라도 대표 story는 공개 경로 기준 컴포넌트 폴더에 둔다.
- story에서 `apps/*` 또는 앱 내부 alias를 import하지 않는다.

## 기본 형식

- CSF3 형식을 사용한다.
- `Meta`, `StoryObj`는 `@storybook/react`에서 타입 import로 가져온다.
- `meta`는 `satisfies Meta<typeof Component>`를 사용한다.
- `type Story = StoryObj<typeof meta>`를 선언한다.
- 자동 문서화를 위해 `tags: ["autodocs"]`를 유지한다.
- `title`은 `Components/<ComponentName>` 형식을 기본으로 한다.

```tsx
import type { Meta, StoryObj } from "@storybook/react";
import { Button } from "./Button.tsx";

const meta = {
  title: "Components/Button",
  component: Button,
  parameters: {
    layout: "centered",
  },
  tags: ["autodocs"],
} satisfies Meta<typeof Button>;

export default meta;
type Story = StoryObj<typeof meta>;
```

## Args와 컨트롤

- 기본 story는 `Default`로 둔다.
- variant, size, boolean, enum props는 `argTypes`에 컨트롤과 한국어 설명을 제공한다.
- `args`로 표현 가능한 예시는 `render`를 만들지 않는다.
- 조합 UI, 상태 보존, 테이블처럼 마크업 구성이 필요한 경우에만 `render`를 사용한다.
- 이벤트 props는 실제 브라우저 `alert`보다 Storybook actions나 테스트 가능한 콜백을 우선한다.

## 필수 커버리지

컴포넌트 성격에 따라 아래 story를 작성한다.

- 기본 상태: `Default`
- variant 전체: `AllVariants` 또는 variant별 story
- 크기 전체: `AllSizes` 또는 size별 story
- 비활성/선택/에러/로딩 같은 상태
- 긴 텍스트, 빈 데이터, overflow처럼 레이아웃이 깨질 수 있는 상태
- 키보드 조작이 필요한 컴포넌트의 포커스와 disabled 흐름
- controlled/uncontrolled 둘 다 지원하면 두 사용 방식을 모두 보여준다.

## 데이터와 문구

- story 데이터는 파일 내부의 작고 결정적인 mock 데이터를 사용한다.
- 네트워크 요청, 앱 store, 라우터, 실제 서비스 API에 의존하지 않는다.
- 예시 문구는 한국어를 우선한다.
- 서비스 도메인 문구가 꼭 필요하면 일반 예시 데이터로 작성하고 실제 API 응답을 복사하지 않는다.

## 스타일

- story용 wrapper는 레이아웃 확인에 필요한 최소한으로 둔다.
- 컴포넌트의 실제 스타일을 story에서 덮어쓰지 않는다.
- 새 디자인 값이 필요하면 컴포넌트 스타일과 토큰을 먼저 정리한다.
- story 안의 inline style은 배치용 wrapper나 예시 badge처럼 story 전용 표현에만 제한한다.

## 접근성

- `@storybook/addon-a11y`가 활성화되어 있으므로 접근성 오류를 새로 만들지 않는다.
- 아이콘만 있는 UI는 accessible name을 story에서도 확인 가능해야 한다.
- 키보드 조작이 있는 컴포넌트는 Tab, Arrow, Home, End 같은 주요 흐름을 story에서 확인할 수 있어야 한다.
- 색상만으로 상태를 구분하지 않는다.

## 검증

가능하면 변경 후 아래 명령을 실행한다.

```bash
pnpm --filter @repo/ui storybook
pnpm --filter @repo/ui build-storybook
```

빠른 정적 검증이 필요하면 아래 명령을 함께 실행한다.

```bash
pnpm --filter @repo/ui lint
pnpm --filter @repo/ui check-types
```
