import type { Metadata } from "next";

import { TIPS_PAGE } from "./messages";

/**
 * 색인 여부는 서버 공개 플래그가 정한다 — 법무 확인 전(`public: false`)이면 noindex(FE-REQ-058 수용 기준 4).
 * 프론트에 "확인됐다" 상수를 두지 않는다 — 확인 기록이 생기면 서버 값 하나가 바뀐다.
 */
export const tipsMetadata = (isPublic: boolean): Metadata => ({
  title: TIPS_PAGE.title,
  description: TIPS_PAGE.description,
  robots: isPublic ? { index: true, follow: true } : { index: false, follow: false },
});
