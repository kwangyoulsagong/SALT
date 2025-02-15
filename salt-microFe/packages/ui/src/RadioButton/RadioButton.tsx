import { CheckCircle } from "lucide-react";
interface RadioProps {
  checked: boolean;
  onChange: () => void;
}
export const RadioButton = ({ checked, onChange }: RadioProps) => {
  return (
    <>
      <input type="radio" checked={checked} onChange={onChange}></input>
      <CheckCircle size={20} color={checked ? "#687AD7" : "#E1E3E8"} />
    </>
  );
};
