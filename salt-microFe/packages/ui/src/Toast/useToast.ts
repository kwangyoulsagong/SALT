"use client";

import { useContext } from "react";
import { ToastContext } from "./ToastContext";
import type { ToastContextValue } from "./ToastContext";

export const useToast = (): ToastContextValue => {
  const value = useContext(ToastContext);

  if (!value) {
    throw new Error("useToast는 ToastProvider 안에서만 사용할 수 있다.");
  }

  return value;
};
