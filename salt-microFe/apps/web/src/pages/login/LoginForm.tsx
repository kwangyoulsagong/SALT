"use client";

import { useForm, SubmitHandler } from "react-hook-form";
import { InputField } from "@repo/ui/input";
import useAuth from "@/hooks/api/auth/useAuth";

interface IFormInput {
  id: string;
  password: string;
}

/**
 * 클라이언트 잎: 폼 상태와 로그인 뮤테이션을 갖는다.
 *
 * 화면 껍데기(`../index.tsx`)는 서버 컴포넌트로 남는다 (FE-REQ-008 FR-10).
 */
const LoginForm = () => {
  const { register, handleSubmit } = useForm<IFormInput>();
  const { login } = useAuth();
  const onSubmit: SubmitHandler<IFormInput> = (data) => login.mutate(data);

  return (
    <form onSubmit={handleSubmit(onSubmit)} style={{ width: "100%" }}>
      <label htmlFor="id">아이디</label>
      <InputField register={register} name="id" placeholder="id" type="text" />
      <label htmlFor="password">비밀번호</label>
      <InputField
        register={register}
        name="password"
        placeholder="password"
        type="password"
      />
      <input type="submit" />
    </form>
  );
};

export default LoginForm;
