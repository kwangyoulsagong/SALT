import { Text } from "@repo/ui/text";
import Link from "next/link";

import { RedirectSignedIn, SignInForm, SIGN_IN_MESSAGES } from "@/features/sign-in";
import { ROUTES } from "@/shared/config";

import { brandMark, card, inviteRow, screen, title } from "./LoginPage.css";

/**
 * 로그인 화면 (`/`).
 *
 * 서버 컴포넌트다. 상호작용은 `features/sign-in` 잎에만 있다. 스트리밍할 블록이 없다 —
 * 서버에서 기다릴 데이터가 없기 때문이다. `Suspense` 를 두지 않는다.
 *
 * 층은 셋이다: **배경 그라데이션 · 큰 제목 · 흰 카드**(`LoginPage.css.ts`).
 * 초대 안내는 카드 **밖**이다 — 로그인하지 못하는 사람이 갈 곳이라 카드 안의 행동과 섞지 않는다.
 *
 * 로그인한 사람을 홈으로 보내는 일은 `RedirectSignedIn` 이 하고, 폼과 **나란히** 둔다 —
 * 감싸면 이동 판단이 끝나야 폼이 그려진다.
 */
export const LoginPage = () => {
  return (
    <main className={screen}>
      <span className={brandMark}>SALT</span>

      <h1 className={title}>{SIGN_IN_MESSAGES.title}</h1>

      <div className={card}>
        <RedirectSignedIn />
        <SignInForm />
      </div>

      <div className={inviteRow}>
        <Text variant="caption" color="tertiary">
          {SIGN_IN_MESSAGES.inviteHint}
        </Text>
        <Link href={ROUTES.onboarding}>
          <Text variant="caption" color="brand">
            {SIGN_IN_MESSAGES.inviteAction}
          </Text>
        </Link>
      </div>
    </main>
  );
};

export default LoginPage;
