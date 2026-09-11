import AuthGuard from "@/components/Auth/AuthGuard/AuthGuard";
import LoginForm from "./LoginForm";

/**
 * 로그인 화면 (`/`).
 *
 * 서버 컴포넌트다. 상호작용은 `LoginForm` 잎에만 있다.
 * 스트리밍할 블록이 없다 — 서버에서 기다릴 데이터가 없기 때문이다. `Suspense`를 두지 않는다.
 */
export default function LoginPage() {
  return (
    <AuthGuard>
      <LoginForm />
    </AuthGuard>
  );
}
