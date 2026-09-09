import { createContext } from "react";
import type { ReactNode } from "react";
import type { DialogTone } from "./Dialog";

export interface DialogRequest {
  title: ReactNode;
  description?: ReactNode;
  confirmText?: string;
  cancelText?: string;
  tone?: DialogTone;
}

export interface DialogContextValue {
  /** 확인 하나. 닫히면 resolve된다. */
  alert: (request: DialogRequest) => Promise<void>;
  /** 확인/취소. 확인이면 `true`, 취소·ESC면 `false`. */
  confirm: (request: DialogRequest) => Promise<boolean>;
}

export const DialogContext = createContext<DialogContextValue | null>(null);
