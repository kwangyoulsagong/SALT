import { createContext } from "react";
import type { ReactNode } from "react";
import type { ToastTone } from "./Toast";

export interface ToastOptions {
  message: ReactNode;
  tone?: ToastTone;
  /** ms. `0`이면 자동으로 닫히지 않는다. */
  duration?: number;
  action?: ReactNode;
}

export interface ToastContextValue {
  /** 토스트를 띄우고 id를 돌려준다. */
  toast: (options: ToastOptions) => string;
  dismiss: (id: string) => void;
}

export const ToastContext = createContext<ToastContextValue | null>(null);
