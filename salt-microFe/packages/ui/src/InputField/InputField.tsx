import { inputVariants } from "./styles/input.css";
import type { FieldPath, FieldValues, UseFormRegister } from "react-hook-form";
type placeholder = "id" | "password" | "title" | "amount" | "name";
interface InputProps<TFieldValues extends FieldValues> {
  register: UseFormRegister<TFieldValues>;
  name: FieldPath<TFieldValues>;
  variant?: keyof typeof inputVariants;
  placeholder: placeholder;
  type: string;
}
export const InputField = <TFieldValues extends FieldValues>({
  register,
  name,
  variant = "primary",
  placeholder,
  type,
}: InputProps<TFieldValues>) => {
  const placeHolderVariant = {
    id: "아이디를 입력해주세요",
    password: "비밀번호를 입력해주세요",
    title: "제목을 입력해주세요",
    amount: "금액을 입력해주세요",
    name: "예: 김솔트",
  };
  return (
    <input
      {...register(name)}
      className={`${inputVariants[variant]}`}
      placeholder={`${placeHolderVariant[placeholder]}`}
      type={type}
    ></input>
  );
};
