import { Text } from "@repo/ui/text";

import { RedirectSignedIn, SignInForm } from "@/features/sign-in";

import { SIGN_IN_MESSAGES } from "@/features/sign-in";
import { brandMark, column, intro, screen, title } from "./LoginPage.css";

/**
 * 로그인 화면 (`/`).
 *
 * 서버 컴포넌트다. 상호작용은 `features/sign-in` 잎에만 있다. 스트리밍할 블록이 없다 —
 * 서버에서 기다릴 데이터가 없기 때문이다. `Suspense` 를 두지 않는다.
 *
 * 로그인한 사람을 홈으로 보내는 일은 `RedirectSignedIn` 이 한다. 껍데기는 그것을 **폼과
 * 나란히** 두지, 감싸지 않는다 — 감싸면 이동 판단이 끝나야 폼이 그려진다.
 */
export const LoginPage = () => {
  return (
    <main className={screen}>
      <div className={column}>
        <div className={intro}>
          <span className={brandMark}>SALT</span>
          <h1 className={title}>{SIGN_IN_MESSAGES.title}</h1>
          <Text color="secondary">{SIGN_IN_MESSAGES.subtitle}</Text>
        </div>

        <RedirectSignedIn />
        <SignInForm />
      </div>
    </main>
  );
};

export default LoginPage;
