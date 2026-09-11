"use client";

// 클라이언트 잎: 상태·effect·memo 를 갖는다. barrel 로 노출되므로 경계를 스스로 갖는다.
import { Heading } from "@repo/ui/heading";
import { Icon } from "@repo/ui/icon";
import { useState } from "react";

import { GOAL_CATEGORIES, setCategory } from "@/entities/goal";
import { useAppDispatch } from "@/shared/lib";

import { ADD_GOAL_MESSAGES } from "../model/messages";
import { CategoryCell } from "./CategoryCell";
import { Wrapper } from "./CategoryPicker.css";

/** 인터랙션은 feature 에 있다. 카테고리 목록 자체는 `entities/goal` 의 것이다. */
export const CategoryPicker = () => {
  const [selected, setSelected] = useState("");
  const dispatch = useAppDispatch();

  const handleClick = (value: string) => {
    setSelected(selected === value ? "" : value);
    dispatch(setCategory({ category: value }));
  };

  return (
    <section className={Wrapper}>
      {GOAL_CATEGORIES.map((value) => (
        <CategoryCell key={value.id}>
          <Icon onClick={() => handleClick(value.id)} variant={value.variant} />
          <Heading level={3}>{value.label}</Heading>
          {selected == value.id && <div>{ADD_GOAL_MESSAGES.selected}</div>}
        </CategoryCell>
      ))}
    </section>
  );
};

export default CategoryPicker;
