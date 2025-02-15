import { H2 } from "@repo/ui/h2";
import { InputField } from "@repo/ui/input";
import { useForm, SubmitHandler } from "react-hook-form";
import ModalContainer from "./ModalOverlay/ModalContainer/ModalContainer";
import ModalHeader from "./ModalOverlay/ModalContainer/ModalHeader/ModalHeader";
import ModalOverlay from "./ModalOverlay/ModalOverlay";
import { X } from "lucide-react";
import { closeButton } from "./ModalOverlay/ModalContainer/ModalHeader/ModalHeader.css";
import ModalInputContainer from "./ModalOverlay/ModalContainer/ModalInputContainer/ModalInputContainer";
import { Container } from "./ModalOverlay/ModalContainer/ModalInputContainer/ModalInputContainer.css";
interface IFormInput {
  name: string;
  birthDate: string;
  firstDigit: string;
}
interface AuthModalProps {
  onClose: () => void;
  setStep: (number: number) => void;
}
const AuthModal = ({ onClose, setStep }: AuthModalProps) => {
  const { register, handleSubmit } = useForm<IFormInput>();

  const onSubmit: SubmitHandler<IFormInput> = (data) => console.log(data);
  return (
    <ModalOverlay>
      <ModalContainer>
        <ModalHeader>
          <H2>본인확인</H2>
          <button onClick={onClose} className={closeButton}>
            <X size={24} />
          </button>
        </ModalHeader>

        <form onSubmit={handleSubmit(onSubmit)} className={Container}>
          <label>이름</label>
          <InputField
            register={register}
            variant="bank"
            name="name"
            placeholder="name"
            type="text"
          />
          <label>생년월일</label>
          <InputField
            register={register}
            variant="bank"
            name="birth"
            placeholder="birth"
            type="string"
          />
          <input type="submit" />
        </form>
      </ModalContainer>
    </ModalOverlay>
  );
};
export default AuthModal;
