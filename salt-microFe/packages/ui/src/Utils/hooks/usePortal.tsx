"use client";

import { useEffect, useState } from "react";

/**
 * SSR에서는 `false`, 클라이언트 마운트 후 `true`.
 * `createPortal`은 `document`가 있어야 하므로 이 값으로 감싼다.
 */
export const usePortal = () => {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  return mounted;
};
