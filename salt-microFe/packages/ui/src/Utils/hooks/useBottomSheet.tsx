"use client";

import { useCallback, useMemo, useState } from "react";

export interface UseBottomSheetResult {
  open: boolean;
  onOpen: () => void;
  onClose: () => void;
  toggle: () => void;
  /** `<BottomSheet {...sheetProps}>`로 그대로 펼친다. */
  sheetProps: { open: boolean; onClose: () => void };
}

/** 바텀 시트 열림 상태를 화면마다 다시 쓰지 않게 묶어둔다. */
export const useBottomSheet = (
  defaultOpen = false
): UseBottomSheetResult => {
  const [open, setOpen] = useState(defaultOpen);

  const onOpen = useCallback(() => setOpen(true), []);
  const onClose = useCallback(() => setOpen(false), []);
  const toggle = useCallback(() => setOpen((prev) => !prev), []);

  const sheetProps = useMemo(() => ({ open, onClose }), [open, onClose]);

  return { open, onOpen, onClose, toggle, sheetProps };
};
