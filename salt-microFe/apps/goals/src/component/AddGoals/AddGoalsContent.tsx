import CategoriesWrapper from "@/component/AddGoals/GoalsForm/CategoriesWrapper/CategoriesWrapper";
import GoalsForm from "@/component/AddGoals/GoalsForm/GoalsForm";
import Wrapper from "@/component/AddGoals/Wrapper/Wrapper";
import { Button } from "@repo/ui/button";
import { InputField } from "@repo/ui/input";
import { SubmitHandler, useForm } from "react-hook-form";
import { useAppSelector } from "@/hooks/redux/hooks";
import SubmitButtonWrapper from "./SubmitButtonWrapper/SubmitButtonWrapper";
import { useMessageEventBus } from "@repo/message-event-bus/eventbus";
import { EVENT_NAMES, type EventPayloadMap } from "@repo/message-event-bus/events";
import { useState } from "react";

interface IFormInput {
  title: string;
  amount: number;
}

type AccountSelectedPayload =
  EventPayloadMap[(typeof EVENT_NAMES)["accountSelected"]];

const AddGoalsContent = () => {
  const { register, handleSubmit } = useForm<IFormInput>();
  const { useSubscription } = useMessageEventBus();
  const goals = useAppSelector((state) => state.goal);
  const [accountData, setAccountData] = useState<AccountSelectedPayload | null>(
    null
  );

  // 구독 설정
  useSubscription(EVENT_NAMES.accountSelected, (data) => {
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
        <SubmitButtonWrapper>
          <Button type="submit" fullWidth>
            추가하기
          </Button>
        </SubmitButtonWrapper>
      </form>
    </Wrapper>
  );
};
export default AddGoalsContent;
