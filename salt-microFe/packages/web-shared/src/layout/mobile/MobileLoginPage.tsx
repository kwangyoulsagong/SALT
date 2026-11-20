import { MOBILE_PATHS } from "@repo/core/mobile";

import { ROUTES } from "../../config";
import { SignInForm } from "../SignInForm";

import { DesktopViewLink } from "./DesktopViewLink";
import { MOBILE_MESSAGES } from "./messages";
import { loginForm, loginHint, loginScreen, loginTitle } from "./MobileShell.css";

/**
 * `/m/login`(`FE-REQ-071` FR-6) — 셸 로그인과 같은 폼 · 같은 BFF 계약 · 같은 쿠키(path `/`). 로그인 뒤 `/m/home`.
 * 이미 로그인한 사람은 휴대폰 미들웨어가 서버에서 `/m/home` 으로 보낸다(표지 쿠키 — 셸 `/` 와 같은 판정).
 * 초대 수락은 데스크톱 · 브라우저 그대로(`FEATURE-019` FR-5).
 */
export const MobileLoginPage = () => (
  <main className={loginScreen}>
    <h1 className={loginTitle}>{MOBILE_MESSAGES.loginTitle}</h1>
    <p className={loginHint}>{MOBILE_MESSAGES.loginHint}</p>
    <div className={loginForm}>
      <SignInForm homeHref={MOBILE_PATHS.home} />
    </div>
    <DesktopViewLink to={ROUTES.login} />
  </main>
);
