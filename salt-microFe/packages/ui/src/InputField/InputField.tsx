import { inputVariants } from "./styles/input.css.ts";
import { UseFormRegister } from "react-hook-form";
type placeholder =
  | "id"
  | "password"
  | "title"
  | "amount"
  | "name"
  | "birth"
  | "birthSecrete";
interface InputProps {
  register: UseFormRegister<any>;
  name: string;
  variant?: keyof typeof inputVariants;
  placeholder: placeholder;
  type: string;
}
export const InputField = ({
  register,
  name,
  variant = "primary",
  placeholder,
  type,
}: InputProps) => {
  const placeHolderVariant = {
    id: "아이디를 입력해주세요",
    password: "비밀번호를 입력해주세요",
    title: "제목을 입력해주세요",
    amount: "금액을 입력해주세요",
    name: "예: 김솔트",
    birth: "예: 990117",
    birthSecrete: "",
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
