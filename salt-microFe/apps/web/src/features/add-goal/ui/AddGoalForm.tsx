"use client";

// 클라이언트 잎: react-hook-form 을 쓴다.
import { Button } from "@repo/ui/button";
import { InputField } from "@repo/ui/input";
import { SubmitHandler, useForm } from "react-hook-form";

import { useGoalDraft } from "@/entities/goal";

import { ADD_GOAL_MESSAGES } from "../model/messages";
import { AddGoalFormInput } from "../model/types";
import { AddGoalWrapper } from "./AddGoalWrapper";
import { CategoryPicker } from "./CategoryPicker";
import { GoalFieldSet } from "./GoalFieldSet";
import { SubmitButtonWrapper } from "./SubmitButtonWrapper";

export const AddGoalForm = () => {
  const { register, handleSubmit } = useForm<AddGoalFormInput>();
  const goalDraft = useGoalDraft();

  // `account.selected` 이벤트 버스 구독을 제거했다 (FE-REQ-007 FR-7).
  // 계좌 연동 자체가 제품 범위에서 빠졌고(FEATURE-000, 원장은 100% 수기 입력),
  // 발행하는 쪽이 없어 payload 는 항상 null 이었다.
  const onSubmit: SubmitHandler<AddGoalFormInput> = (data) => {
    console.log(data);
    console.log(goalDraft);
  };

  return (
    <AddGoalWrapper>
      <form onSubmit={handleSubmit(onSubmit)}>
        <GoalFieldSet>
          <CategoryPicker />
          <InputField
            register={register}
            name="title"
            placeholder={ADD_GOAL_MESSAGES.titlePlaceholder}
            type="text"
            variant="goals"
          />
          <InputField
            register={register}
            name="amount"
            placeholder={ADD_GOAL_MESSAGES.amountPlaceholder}
            type="number"
            variant="goals"
          />
        </GoalFieldSet>
        <SubmitButtonWrapper>
          <Button type="submit" fullWidth>
            {ADD_GOAL_MESSAGES.submit}
          </Button>
        </SubmitButtonWrapper>
      </form>
    </AddGoalWrapper>
  );
};

export default AddGoalForm;
