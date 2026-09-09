"use client";

import type { ReactNode } from "react";
import { Button } from "../Button/Button";
import { Modal } from "../Modal/Modal";
import { descriptionStyles } from "./styles/dialog.css";

export type DialogTone = "default" | "danger";

export interface DialogProps {
  open: boolean;
  title: ReactNode;
  description?: ReactNode;
  /** 확인 버튼 문구 */
  confirmText?: string;
  /** 넘기면 취소 버튼이 함께 나온다(confirm). 없으면 알림(alert)이다. */
  cancelText?: string;
  tone?: DialogTone;
  onConfirm: () => void;
  onCancel?: () => void;
  /** 자세한 내용을 넣을 슬롯 */
  children?: ReactNode;
}

/**
 * 확인 한 번을 받아야 넘어가는 짧은 대화 상자.
 * 여러 항목을 담아야 하면 `Modal`이나 `BottomSheet`를 쓴다.
 */
export const Dialog = ({
  open,
  title,
  description,
  confirmText = "확인",
  cancelText,
  tone = "default",
  onConfirm,
  onCancel,
  children,
}: DialogProps) => {
  const close = onCancel || onConfirm;

  return (
    <Modal
      open={open}
      onClose={close}
      title={title}
      size="sm"
      hideCloseButton
      disableBackdropClose={Boolean(cancelText)}
      footer={
        <>
          {cancelText ? (
            <Button variant="ghost" size="sm" fullWidth onClick={onCancel}>
              {cancelText}
            </Button>
          ) : null}
          <Button
            variant={tone === "danger" ? "danger" : "primary"}
            size="sm"
            fullWidth
            onClick={onConfirm}
          >
            {confirmText}
          </Button>
        </>
      }
    >
      {description ? <p className={descriptionStyles}>{description}</p> : null}
      {children}
    </Modal>
  );
};
