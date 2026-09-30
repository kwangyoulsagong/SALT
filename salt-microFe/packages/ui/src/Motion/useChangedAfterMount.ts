"use client";

import { useEffect, useRef, useState } from "react";

/**
 * 마운트 뒤 사용자 조작으로 값이 바뀌었는가 (FE-REQ-044 P-33 · P-34).
 *
 * 별 토글 · 체크처럼 **바뀐 순간에만** 튀어야 하는 것에 쓴다. 첫 렌더부터 켜진 별 20개가
 * 페이지를 열 때마다 한꺼번에 튀면 안 된다. 바뀔 때마다 늘어나는 번호를 돌려주므로 `key` 로 쓰면 다시 재생된다.
 */
export const useChangedAfterMount = (value: unknown) => {
  const first = useRef(value);
  const [changes, setChanges] = useState(0);

  useEffect(() => {
    if (Object.is(first.current, value)) return;
    first.current = value;
    setChanges((count) => count + 1);
  }, [value]);

  return changes;
};
