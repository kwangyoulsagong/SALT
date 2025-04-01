import { useState } from "react";
import BankRegistrationWrapper from "./BankRegistrationWrapper/BankRegistrationWrapper";
import Progress from "./Progress/Progress";
import ServiceSteps from "./ServiceSteps/ServiceSteps";
const BankRegistration = () => {
  const [step, setStep] = useState(1);
  return (
    <BankRegistrationWrapper>
      <Progress step={step} />
      <ServiceSteps step={step} setStep={setStep} />
    </BankRegistrationWrapper>
  );
};
export default BankRegistration;
