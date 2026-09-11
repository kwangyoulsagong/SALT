"use client";

import type { ReactNode } from "react";
import { Provider as ReduxProvider } from "react-redux";
import { store } from "@/store/redux";
import QueryClientProvider from "./QueryClientProvider";
import AuthWrapper from "@/components/Auth/AuthWrapper/AuthWrapper";
import MockServiceWorker from "./MockServiceWorker";

/**
 * 전역 프로바이더 (FE-REQ-008 FR-2).
 *
 * 루트 `app/layout.tsx` 는 `<html>`·`<body>` 껍데기만 두고 프로바이더를 여기서 가져간다.
 * React Query·Redux 는 전부 클라이언트 컨텍스트이므로 이 파일이 `"use client"` 경계다.
 *
 * **이 경계 아래가 전부 클라이언트가 되는 것은 아니다.** `children` 으로 들어온 서버
 * 컴포넌트는 서버에서 렌더돼 이미 만들어진 트리로 꽂힌다. 그래서 페이지·블록은
 * 서버 컴포넌트로 남을 수 있다.
 */
const AppProviders = ({ children }: { children: ReactNode }) => {
  return (
    <QueryClientProvider>
      <ReduxProvider store={store}>
        <MockServiceWorker />
        <AuthWrapper>{children}</AuthWrapper>
      </ReduxProvider>
    </QueryClientProvider>
  );
};

export default AppProviders;
