import { AuthGuard, SignInForm } from "@/features/sign-in";

/**
 * 로그인 화면 (`/`).
 *
 * 서버 컴포넌트다. 상호작용은 `features/sign-in` 잎에만 있다.
 * 스트리밍할 블록이 없다 — 서버에서 기다릴 데이터가 없기 때문이다. `Suspense` 를 두지 않는다.
 */
export const LoginPage = () => {
  return (
    <AuthGuard>
      <SignInForm />
    </AuthGuard>
  );
};

export default LoginPage;
