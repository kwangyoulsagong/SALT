import { useState } from "react";
import BankRegistrationWrapper from "./BankRegistrationWrapper/BankRegistrationWrapper";
import Progress from "./Progress/Progress";

const BankRegistration = () => {
  const [step, setStep] = useState(1);
  return (
    <BankRegistrationWrapper>
      <Progress step={step} />
    </BankRegistrationWrapper>
  );
};
export default BankRegistration;
