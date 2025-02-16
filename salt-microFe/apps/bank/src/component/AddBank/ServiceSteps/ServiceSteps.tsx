import { ServiceStep } from "./ServiceStepsWrapper/libs/data";
import ServiceStepsWrapper from "./ServiceStepsWrapper/ServiceStepsWrapper";
import { H2 } from "@repo/ui/h2";
import { H3 } from "@repo/ui/h3";
import { P } from "@repo/ui/p";
import { RadioButton } from "@repo/ui/radiobutton";
import { SubmitButton } from "@repo/ui/submitbutton";
import TypoWrapper from "./ServiceStepsWrapper/TypoWrapper/TypoWrapper";
import BankAccountWrapper from "./ServiceStepsWrapper/BankAccountWrapper/BankAccountWrapper";
import BankAccountContainer from "./ServiceStepsWrapper/BankAccountWrapper/BankAccountContainer/BankAccountContainer";
import Circle from "./ServiceStepsWrapper/BankAccountWrapper/BankAccountContainer/Circle/Circle";
import { CreditCard } from "lucide-react";
import BankAccountInfo from "./ServiceStepsWrapper/BankAccountWrapper/BankAccountContainer/BankAccountInfo/BankAccountInfo";
import { useEffect, useState } from "react";
import AuthModal from "./ServiceStepsWrapper/authModal/authModal";
import useBank from "@/hooks/api/bank/useBank";
interface ServiceSteps {
  step: number;
  setStep: (number: number) => void;
}
interface BankAccount {
  fintech_use_num: string;
  account_alias: string;
  bank_name: string;
  account_num_masked: string;
}
const ServiceSteps = ({ step, setStep }: ServiceSteps) => {
  const currentStep = ServiceStep.find((v) => v.step === step);
  const [selectedAccount, setSelectedAccount] = useState<string | null>(null);
  const [modal, setModal] = useState(false);
  const { accountList } = useBank();
  const [bankAccount, setBankAccount] = useState<BankAccount[] | null>(null);
  const handleAccountSelect = (accountId: string) => {
    setSelectedAccount(accountId);
  };

  useEffect(() => {
    if (currentStep?.step === 2 && accountList.data) {
      setBankAccount(accountList.data.account_list);
    }
  }, [currentStep?.step, accountList.data]);
  const handleClick = (step: number) => {
    if (step === 1) {
      setModal(true);
    }
  };
  const handleClose = () => {
    setModal(false);
  };
  return (
    <ServiceStepsWrapper>
      {currentStep?.step && (
        <TypoWrapper>
          <H2>{currentStep.header}</H2>
          <P>{currentStep.text}</P>
        </TypoWrapper>
      )}
      {currentStep?.step == 2 && (
        <BankAccountWrapper>
          {bankAccount?.map((account) => (
            <BankAccountContainer key={account.fintech_use_num}>
              <section
                style={{ display: "flex", gap: "10px", alignItems: "center" }}
              >
                <Circle color="#687AD7">
                  <CreditCard width={15} height={15} color="#ffffff" />
                </Circle>
                <BankAccountInfo>
                  <H3>{account.bank_name}</H3>
                  <P>{account.account_num_masked}</P>
                </BankAccountInfo>
              </section>
              <RadioButton
                checked={selectedAccount === account.fintech_use_num}
                onChange={() => handleAccountSelect(account.fintech_use_num)}
              />
            </BankAccountContainer>
          ))}
        </BankAccountWrapper>
      )}
      {currentStep?.step && (
        <SubmitButton
          variant="sm"
          type="submit"
          onClick={() => handleClick(currentStep.step)}
        >
          {currentStep.button}
        </SubmitButton>
      )}
      {modal && <AuthModal onClose={handleClose} setStep={setStep} />}
    </ServiceStepsWrapper>
  );
};
export default ServiceSteps;
