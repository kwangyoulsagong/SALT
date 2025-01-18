import { useForm, SubmitHandler } from "react-hook-form";
import { InputField } from "@repo/ui/input";
import useAuth from "@/hooks/api/auth/useAuth";
import AuthGuard from "@/components/Auth/AuthGuard/AuthGuard";

interface IFormInput {
  id: string;
  password: string;
}

export default function App() {
  const { register, handleSubmit } = useForm<IFormInput>();
  const { login } = useAuth();
  const onSubmit: SubmitHandler<IFormInput> = (data) => login.mutate(data);

  return (
    <AuthGuard>
      <form onSubmit={handleSubmit(onSubmit)} style={{ width: "100%" }}>
        <label>아이디</label>
        <InputField
          register={register}
          name="id"
          placeholder="id"
          type="text"
        />
        <label>비밀번호</label>
        <InputField
          register={register}
          name="password"
          placeholder="password"
          type="password"
        />
        <input type="submit" />
      </form>
    </AuthGuard>
  );
}
