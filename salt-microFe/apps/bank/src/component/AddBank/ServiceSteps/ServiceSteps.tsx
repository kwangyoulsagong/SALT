import { ServiceStep } from "./ServiceStepsWrapper/libs/data";
import ServiceStepsWrapper from "./ServiceStepsWrapper/ServiceStepsWrapper";
import { H2 } from "@repo/ui/h2";
import { P } from "@repo/ui/p";
import { SubmitButton } from "@repo/ui/submitbutton";
import TypoWrapper from "./ServiceStepsWrapper/TypoWrapper/TypoWrapper";
import { useState } from "react";
import AuthModal from "./ServiceStepsWrapper/authModal/authModal";
import { useMessageEventBus } from "@repo/message-event-bus/eventbus";
import { useRouter } from "next/router";
import BankAccountSelector from "./ServiceStepsWrapper/BankAccountSelector/BankAccountSelector";
interface BankAccount {
  fintech_use_num: string;
  account_alias: string;
  bank_name: string;
  account_num_masked: string;
}

interface ServiceSteps {
  accounts: BankAccount[];
  step: number;
  setStep: (number: number) => void;
}

const ServiceSteps = ({ accounts, step, setStep }: ServiceSteps) => {
  const router = useRouter();
  const { publish } = useMessageEventBus();
  const currentStep = ServiceStep.find((v) => v.step === step);
  const [selectedBankAccount, setSelectedBankAccount] = useState<string | null>(
    null
  );
  const [modal, setModal] = useState(false);

  const handleAccountSelect = (accountId: string) => {
    setSelectedBankAccount(accountId);
  };

  const handleClick = (step: number) => {
    if (step === 1) {
      setModal(true);
    }
    if (step === 2) {
      if (selectedBankAccount) {
        publish("ACCOUNT_SELECTED", selectedBankAccount);
      }
      setStep(3);
    }
    if (step == 3) {
      router.push("/goals/addgoals");
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
        <BankAccountSelector
          accounts={accounts}
          onAccountSelect={handleAccountSelect}
        />
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
