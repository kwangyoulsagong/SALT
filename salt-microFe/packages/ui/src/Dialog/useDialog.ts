"use client";

import { useContext } from "react";
import { DialogContext } from "./DialogContext";
import type { DialogContextValue } from "./DialogContext";

export const useDialog = (): DialogContextValue => {
  const value = useContext(DialogContext);

  if (!value) {
    throw new Error("useDialog는 DialogProvider 안에서만 사용할 수 있다.");
  }

  return value;
};
