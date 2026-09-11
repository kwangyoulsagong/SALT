---
globs: apps/*/src/app/**
---

# app 레이어 (Layer 5 — 앱 초기화)

> **주의.** 여기는 `src/app`(FSD 레이어)다. Next 라우팅은 **프로젝트 루트 `app/`** 에 있다. 이름이 같으니 매번 확인한다.

## 허용 Import

- 모든 하위 레이어 — 허용
- 다른 앱(`apps/*/src/**`) — **금지**

## 구조

```
src/app/
├── providers/     React Query · Redux · 세션 복원 · MSW — "use client"
├── styles/        전역 스타일 · reset · 토큰 주입
├── ui/            앱 껍데기(AppShell) — 화면이 아니라 프레임이다
├── mock/          MSW 워커·핸들러 (dev 전용 부팅)
├── store.ts       슬라이스 reducer 조립 · RootState
├── api-routes/    Route Handler 로직 (루트 app/api/**/route.ts 가 re-export) — 아직 없다
└── index.ts
```

`ui/`에 **화면을 두지 않는다.** 여기 들어갈 수 있는 것은 루트 `layout.tsx`가 쓰는 프레임뿐이다.
`shared/ui`에 두지 않는 이유는 라우팅 파일이 `@/app`·`@/pages`만 import할 수 있기 때문이다
(`FE-REQ-009` FR-25).

MSW가 `shared/api`가 아니라 여기 있는 이유: **워커 설치는 dev 부팅이지 API 클라이언트가 아니다.**
`msw/browser`를 `shared/api` barrel에 넣으면 그 barrel을 쓰는 모든 곳의 서버 컴파일에 끌려 온다.

## 원칙

- **앱 초기화만** 한다. 화면을 두지 않는다.
- 프로바이더는 `"use client"`다. 루트 `app/layout.tsx`는 `<html>`·`<body>` 껍데기만 두고 여기서 프로바이더를 가져온다.
- **Route Handler 로직은 여기 정의하고 루트가 re-export한다:**

```ts
// src/app/api-routes/session.ts
export const refreshSession = async (req: Request) => { /* ... */ };

// app/api/session/route.ts
export { refreshSession as POST } from '@/app/api-routes';
```

## 프로바이더 순서

```tsx
<QueryProvider>          {/* 서버에서 온 데이터를 hydrate */}
  <ThemeProvider>        {/* @repo/tokens 주입 */}
    <ToastProvider>
      <DialogProvider>   {/* useDialog().confirm 이 Promise<boolean> */}
        {children}
      </DialogProvider>
    </ToastProvider>
  </ThemeProvider>
</QueryProvider>
```

## React Query의 역할을 좁힌다

App Router + RSC에서는 **서버 컴포넌트가 조회를 담당한다.** React Query는 다음에만 쓴다.

| 쓴다 | 안 쓴다 |
|---|---|
| mutation (피드백 · 적립 완료 · 목표 추가 · CSV 업로드) | 첫 화면 데이터 조회 |
| 실시간 갱신 (시세 WS 반영 · 코치 SSE) | 서버가 이미 준 데이터 재요청 |
| 사용자 조작 후 무효화 | 폴링으로 대체 가능한 것 |

`staleTime`을 **명시적으로** 준다. 기본값 0이면 포커스마다 재요청한다.

## Route Handler를 만들기 전에 확인한다

이 앱의 데이터는 전부 BFF에서 온다. **Route Handler를 만드는 정당한 이유는 두 가지뿐이다.**

1. 브라우저에 노출하면 안 되는 것을 서버에서 처리해야 할 때 (세션 쿠키 갱신)
2. 서버 컴포넌트에서 부를 수 없는 것 (클라이언트에서 시작하는 업로드 프록시)

그 외에는 **BFF에 엔드포인트를 만든다.** Route Handler에 비즈니스 로직이 쌓이면 BFF가 두 개가 된다.
