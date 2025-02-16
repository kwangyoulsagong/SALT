import { H2 } from "@repo/ui/h2";
import { InputField } from "@repo/ui/input";
import { useForm, SubmitHandler } from "react-hook-form";
import ModalContainer from "./ModalOverlay/ModalContainer/ModalContainer";
import ModalHeader from "./ModalOverlay/ModalContainer/ModalHeader/ModalHeader";
import ModalOverlay from "./ModalOverlay/ModalOverlay";
import { X } from "lucide-react";
import { closeButton } from "./ModalOverlay/ModalContainer/ModalHeader/ModalHeader.css";
import {
  Container,
  Label,
} from "./ModalOverlay/ModalContainer/ModalInputContainer/ModalInputContainer.css";
import InfoWrapper from "./ModalOverlay/ModalContainer/ModalInputContainer/InfoWrapper/InfoWrapper";
import BirthWrapper from "./ModalOverlay/ModalContainer/ModalInputContainer/InfoWrapper/BirthWrapper/BirthWrapper";
import BirthSecrete from "./ModalOverlay/ModalContainer/ModalInputContainer/InfoWrapper/BirthWrapper/BirthSecrete/BirthSecrete";
import { SubmitButton } from "@repo/ui/submitbutton";
import ModalFooter from "./ModalOverlay/ModalContainer/ModalFooter/ModalFooter";
import useBank from "@/hooks/api/bank/useBank";
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
  const bankToken = localStorage.getItem("bankToken");
  const { register, handleSubmit } = useForm<IFormInput>();
  const { auth } = useBank();
  const onSubmit: SubmitHandler<IFormInput> = async (data) => {
    await auth.mutate(data);
    setStep(2);
    onClose();
  };

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
          <InfoWrapper>
            <label className={Label}>이름</label>
            <InputField
              register={register}
              variant="bank"
              name="name"
              placeholder="name"
              type="text"
            />
          </InfoWrapper>
          <InfoWrapper>
            <label className={Label}>생년월일 (YYMMDD)</label>
            <BirthWrapper>
              <InputField
                register={register}
                variant="birth"
                name="birth"
                placeholder="birth"
                type="string"
              />
              <div style={{ display: "flex" }}>
                <InputField
                  register={register}
                  variant="birthSecrete"
                  name="birthSecrete"
                  placeholder="birthSecrete"
                  type="string"
                />
                <BirthSecrete />
              </div>
            </BirthWrapper>
          </InfoWrapper>
          <SubmitButton variant="md" type="submit">
            다음
          </SubmitButton>
        </form>
        <ModalFooter />
      </ModalContainer>
    </ModalOverlay>
  );
};
export default AuthModal;
