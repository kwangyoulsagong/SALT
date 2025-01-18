import { inputVariants } from "./styles/input.css";
type placeholder = "id" | "password";
interface InputProps {
  value: string;
  variant?: keyof typeof inputVariants;
  onChange: () => void;
  placeholder: placeholder;
}
const InputField = ({ value, variant, onChange, placeholder }: InputProps) => {
  const placeHolderVariant = {
    id: "아이디를 입력해주세요",
    password: "비밀번호를 입력해주세요",
  };
  return (
    <input
      value={value}
      className={`${inputVariants[variant]}`}
      placeholder={`${placeHolderVariant[placeholder]}`}
      onChange={onChange}
    ></input>
  );
};
export default InputField;
