import { privatePageMetadata } from "@repo/web-shared/config";
import { todayInKorea } from "@repo/web-shared/lib";

/** 이야기 카드 화면 문구(가계부 S1g) — 사실만. 평가 · 칭찬 · 재촉 0 */
export const STORY_PAGE = {
  back: "가계부로",
  title: "이야기 카드",
  description: "이 기간에 적은 것을 한 장으로 모았어요. 점수나 비교는 없어요",
  blockName: "이야기 카드",
  yearLink: (year: string) => `${year}년 이야기 보기`,
  monthLink: "이 달 가계부",
  /** 아래 이동 영역 이름 — 페이지 제목(이야기 카드)과 겹치지 않게 */
  moreLinks: "이 기간 더 보기",
  signedOut: "로그인하면 볼 수 있어요",
  loadFailed: "불러오지 못했어요",
} as const;

const PERIOD = /^\d{4}(-(0[1-9]|1[0-2]))?$/;

/** 주소의 기간이 형식에 맞고 오지 않은 기간이 아닌가 — 틀리면 404(볼 수 있는 날은 서버가 정한다) */
export const isStoryPeriod = (value: string): boolean => {
  if (!PERIOD.test(value)) return false;
  const today = todayInKorea();
  return value.length === 4 ? value <= today.slice(0, 4) : value <= today.slice(0, 7);
};

/** 이번 달이면 가계부 첫 화면, 지난 달이면 그 달 주소 — 가계부 머리의 달 이동과 같은 규칙 */
export const isCurrentMonth = (period: string): boolean => period === todayInKorea().slice(0, 7);

/** 내 기록이 보이는 화면 — 검색에 싣지 않는다 */
export const metadata = privatePageMetadata("이야기 카드");
