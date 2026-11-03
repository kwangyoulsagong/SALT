import { redirect } from "next/navigation";

/** 옛 셸 만들기 주소(`/goals/addgoals`) — 저축 zone 의 새 만들기로 보낸다(`FE-REQ-056`, 2026-11-03). 북마크 · 옛 온보딩 링크용 */
export default function LegacyAddGoalRedirect() {
  redirect("/goals/new");
}
