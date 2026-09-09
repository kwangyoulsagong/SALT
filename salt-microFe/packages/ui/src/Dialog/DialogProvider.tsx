"use client";

import { useCallback, useMemo, useRef, useState } from "react";
import type { ReactNode } from "react";
import { Dialog } from "./Dialog";
import { DialogContext } from "./DialogContext";
import type { DialogRequest } from "./DialogContext";

interface PendingDialog extends DialogRequest {
  /** 취소 버튼이 있는지. confirm이면 true */
  cancelable: boolean;
}

export interface DialogProviderProps {
  children: ReactNode;
}

export const DialogProvider = ({ children }: DialogProviderProps) => {
  const [pending, setPending] = useState<PendingDialog | null>(null);
  const resolveRef = useRef<((confirmed: boolean) => void) | null>(null);

  const settle = useCallback((confirmed: boolean) => {
    setPending(null);
    resolveRef.current?.(confirmed);
    resolveRef.current = null;
  }, []);

  const alert = useCallback((request: DialogRequest) => {
    setPending({ ...request, cancelable: false });
    return new Promise<void>((resolve) => {
      resolveRef.current = () => resolve();
    });
  }, []);

  const confirm = useCallback((request: DialogRequest) => {
    setPending({
      cancelText: "취소",
      ...request,
      cancelable: true,
    });
    return new Promise<boolean>((resolve) => {
      resolveRef.current = resolve;
    });
  }, []);

  const value = useMemo(() => ({ alert, confirm }), [alert, confirm]);

  return (
    <DialogContext.Provider value={value}>
      {children}
      {pending ? (
        <Dialog
          open
          title={pending.title}
          description={pending.description}
          confirmText={pending.confirmText}
          cancelText={pending.cancelable ? pending.cancelText : undefined}
          tone={pending.tone}
          onConfirm={() => settle(true)}
          onCancel={pending.cancelable ? () => settle(false) : undefined}
        />
      ) : null}
    </DialogContext.Provider>
  );
};
