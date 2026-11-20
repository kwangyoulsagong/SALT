import { MobilePendingPage } from "@repo/web-shared/layout/mobile";

/** `/m/investments` — 틀만(`FE-REQ-071`). 화면은 F019 순서 2 가 도메인 패키지 `mobile` 진입점으로 바꾼다 */
export default function Page() {
  return <MobilePendingPage tab="invest" />;
}
