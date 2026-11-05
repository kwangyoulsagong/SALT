export { TipsPage as default, generateMetadata } from "@/pages/tips";

/** ISR — 공개 글 목록을 1분마다 다시 만든다(`TIPS_REVALIDATE_SECONDS` 와 같은 값 — 라우트 세그먼트 설정은 리터럴이어야 한다) */
export const revalidate = 60;
