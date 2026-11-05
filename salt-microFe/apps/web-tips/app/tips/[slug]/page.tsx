export { TipDetailPage as default, generateMetadata } from "@/pages/tip-detail";

/** ISR — 글 하나를 1분마다 다시 만든다. 유효기한 경계(자정)도 1분 안에 반영된다 */
export const revalidate = 60;
