"use client";

import { InputField } from "@repo/ui/input";
import { SubmitHandler, useForm } from "react-hook-form";

import { useSignIn } from "../api";
import { SIGN_IN_MESSAGES } from "../model/messages";
import { SignInRequest } from "../model/types";

/**
 * 클라이언트 잎: 폼 상태와 로그인 뮤테이션을 갖는다.
 *
 * 화면 껍데기(`pages/login`)는 서버 컴포넌트로 남는다 (FE-REQ-008 FR-10).
 */
export const SignInForm = () => {
  const { register, handleSubmit } = useForm<SignInRequest>();
  const signIn = useSignIn();
  const onSubmit: SubmitHandler<SignInRequest> = (data) => signIn.mutate(data);

  return (
    <form onSubmit={handleSubmit(onSubmit)} style={{ width: "100%" }}>
      <label htmlFor="id">{SIGN_IN_MESSAGES.idLabel}</label>
      <InputField
        register={register}
        name="id"
        placeholder={SIGN_IN_MESSAGES.idPlaceholder}
        type="text"
      />
      <label htmlFor="password">{SIGN_IN_MESSAGES.passwordLabel}</label>
      <InputField
        register={register}
        name="password"
        placeholder={SIGN_IN_MESSAGES.passwordPlaceholder}
        type="password"
      />
      <input type="submit" />
    </form>
  );
};

export default SignInForm;
