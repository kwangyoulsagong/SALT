import ButtonWrapper from "@/component/AddGoals/GoalsForm/ButtonWrapper/ButtonWrapper";
import CategoriesWrapper from "@/component/AddGoals/GoalsForm/CategoriesWrapper/CategoriesWrapper";
import GoalsForm from "@/component/AddGoals/GoalsForm/GoalsForm";
import Wrapper from "@/component/AddGoals/Wrapper/Wrapper";
import { Button } from "@repo/ui/button";
import { InputField } from "@repo/ui/input";
import { SubmitHandler, useForm } from "react-hook-form";
import BankAccountValid from "@/component/AddGoals/GoalsForm/ButtonWrapper/BankAccountValid/BankAccountValid";
import { ChevronRight } from "lucide-react";
import { useAppSelector } from "@/hooks/redux/hooks";
import SubmitButtonWrapper from "./SubmitButtonWrapper/SubmitButtonWrapper";
import { useMessageEventBus } from "@repo/message-event-bus/eventbus";
import { useEffect, useState } from "react";
interface IFormInput {
  title: string;
  amount: number;
}
const AddGoalsContent = () => {
  const { register, handleSubmit } = useForm<IFormInput>();
  const { useSubscription } = useMessageEventBus();
  const goals = useAppSelector((state) => state.goal);
  const [accountData, setAccountData] = useState(null);

  // 구독 설정
  useSubscription("ACCOUNT_SELECTED", (data) => {
    setAccountData(data);
  });
  const onSubmit: SubmitHandler<IFormInput> = (data) => {
    console.log(data);
    console.log(goals);
    console.log(accountData);
  };

  return (
    <Wrapper>
      <form onSubmit={handleSubmit(onSubmit)}>
        <GoalsForm>
          <CategoriesWrapper />
          <InputField
            register={register}
            name="title"
            placeholder="title"
            type="text"
            variant="goals"
          />
          <InputField
            register={register}
            name="amount"
            placeholder="amount"
            type="number"
            variant="goals"
          />
        </GoalsForm>
        <SubmitButtonWrapper></SubmitButtonWrapper>
      </form>
    </Wrapper>
  );
};
export default AddGoalsContent;
