import { Banner } from "@repo/ui/banner";

import { TIP_MESSAGES as M } from "../model/messages";

/** 유효기한이 지난 글의 "확인 필요" 띠(FE-REQ-058 FR-2) — 색만이 아니라 제목 글자로 */
export const NeedsCheckBand = () => (
  <Banner tone="warning" title={M.needsCheckTitle}>
    {M.needsCheck}
  </Banner>
);
