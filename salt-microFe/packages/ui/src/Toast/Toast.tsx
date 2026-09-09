import type { ReactNode } from "react";
import {
  actionStyles,
  messageStyles,
  toastStyles,
} from "./styles/toast.css";

export type ToastTone = "neutral" | "success" | "error" | "warning" | "info";

export interface ToastProps {
  children: ReactNode;
  tone?: ToastTone;
  /** 되돌리기 같은 후속 행동 슬롯 */
  action?: ReactNode;
  className?: string;
}

/**
 * 토스트 하나의 겉모습.
 * 보통은 직접 쓰지 않고 `ToastProvider` + `useToast`로 띄운다.
 */
export const Toast = ({
  children,
  tone = "neutral",
  action,
  className,
}: ToastProps) => {
  return (
    <div
      role={tone === "error" ? "alert" : "status"}
      className={`${toastStyles({ tone })} ${className || ""}`}
    >
      <span className={messageStyles}>{children}</span>
      {action ? <span className={actionStyles}>{action}</span> : null}
    </div>
  );
};
