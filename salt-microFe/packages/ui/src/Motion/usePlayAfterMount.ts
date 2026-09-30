"use client";

import { useEffect, useState } from "react";

/**
 * 서버 HTML 과 하이드레이션 첫 렌더는 **마지막 프레임**, 마운트 뒤에 처음부터 재생한다 (FE-REQ-044 FR-5).
 *
 * `initial` 을 숨김으로 두면 서버 HTML 에 빈칸이 생기고 JS 가 늦으면 그래픽이 안 보인다.
 * 그래서 첫 렌더는 `initial={false}`(= 끝 상태), 마운트 뒤 `key` 를 바꿔 재생한다.
 */
export const usePlayAfterMount = () => {
  const [played, setPlayed] = useState(false);
  useEffect(() => setPlayed(true), []);
  return played;
};
