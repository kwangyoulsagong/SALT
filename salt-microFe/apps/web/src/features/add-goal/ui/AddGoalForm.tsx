"use client";

// 클라이언트 잎: react-hook-form 을 쓴다.
import { Button } from "@repo/ui/button";
import { EmptyState } from "@repo/ui/emptyState";
import { InputField } from "@repo/ui/input";
import { StatusGraphic } from "@repo/ui/statusGraphic";
import { Text } from "@repo/ui/text";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { SubmitHandler, useForm } from "react-hook-form";

import { useGoalDraft } from "@/entities/goal";
import { ROUTES } from "@/shared/config";

import { useAddGoal } from "../api";
import { toCreateGoalRequest } from "../lib";
import { ADD_GOAL_MESSAGES, ADD_GOAL_SUCCESS_HOLD_MS } from "../model/messages";
import { AddGoalFormInput } from "../model/types";
import { AddGoalWrapper } from "./AddGoalWrapper";
import { CategoryPicker } from "./CategoryPicker";
import { GoalFieldSet } from "./GoalFieldSet";
import { SubmitButtonWrapper } from "./SubmitButtonWrapper";

/**
 * 목표 추가.
 *
 * ## 제출이 아무 데도 가지 않았다
 *
 * `onSubmit` 이 `console.log` 두 줄이었다 (`FE-REQ-010` FR-9). 폼은 완성돼 있고 버튼도
 * 눌렸지만 **서버에 아무것도 도착하지 않았다** — 눌러도 아무 일이 없는 것과 실패하는
 * 것은 화면에서 구분되지 않는다.
 *
 * UI 는 그대로 두고 연결만 한다(FR-9). 다만 **목표일 기본값 한 줄을 추가**했다 —
 * 폼에 날짜 입력이 없는데 서버는 목표일을 요구하므로 우리가 정한 값이 들어간다.
 * 그 값이 홈의 D-Day 가 되므로 사용자가 모르면 안 된다.
 */
export const AddGoalForm = () => {
  const { register, handleSubmit } = useForm<AddGoalFormInput>();
  const goalDraft = useGoalDraft();
  const addGoal = useAddGoal();
  const router = useRouter();

  // 완료 장면을 한 번 보인 뒤 홈으로 (FE-REQ-044 P-2). 기다리기 싫으면 [홈으로] 를 누른다
  useEffect(() => {
    if (!addGoal.isSuccess) return undefined;
    const timer = window.setTimeout(() => router.push(ROUTES.home), ADD_GOAL_SUCCESS_HOLD_MS);
    return () => window.clearTimeout(timer);
  }, [addGoal.isSuccess, router]);

  // `account.selected` 이벤트 버스 구독을 제거했다 (FE-REQ-007 FR-7).
  // 계좌 연동 자체가 제품 범위에서 빠졌고(FEATURE-000, 원장은 100% 수기 입력),
  // 발행하는 쪽이 없어 payload 는 항상 null 이었다.
  const onSubmit: SubmitHandler<AddGoalFormInput> = (data) => {
    if (!goalDraft.category) return;
    addGoal.mutate(toCreateGoalRequest(data, goalDraft.category));
  };

  if (addGoal.isSuccess) {
    return (
      <AddGoalWrapper>
        <div aria-live="polite">
          <EmptyState
            tone="success"
            iconFrame="none"
            icon={<StatusGraphic kind="success" size="lg" />}
            title={ADD_GOAL_MESSAGES.successTitle}
            description={ADD_GOAL_MESSAGES.successDescription}
            action={
              <Button size="sm" onClick={() => router.push(ROUTES.home)}>
                {ADD_GOAL_MESSAGES.goHome}
              </Button>
            }
          />
        </div>
      </AddGoalWrapper>
    );
  }

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
          <Text variant="caption" color="subtle">
            {ADD_GOAL_MESSAGES.defaultPeriodNotice}
          </Text>
          {!goalDraft.category ? (
            <Text variant="caption" color="subtle">
              {ADD_GOAL_MESSAGES.categoryRequired}
            </Text>
          ) : null}
          {addGoal.isError ? (
            <Text variant="caption" color="down">
              {ADD_GOAL_MESSAGES.submitFailed}
            </Text>
          ) : null}
        </GoalFieldSet>
        <SubmitButtonWrapper>
          <Button type="submit" fullWidth loading={addGoal.isPending} disabled={addGoal.isPending}>
            {addGoal.isPending
              ? ADD_GOAL_MESSAGES.submitting
              : ADD_GOAL_MESSAGES.submit}
          </Button>
        </SubmitButtonWrapper>
      </form>
    </AddGoalWrapper>
  );
};

export default AddGoalForm;
