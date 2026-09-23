export { sitemap as default } from "@/app/seo";

/** sitemap 은 시세 목록을 부른다 — 한 시간마다 다시 만든다 */
export const revalidate = 3600;
