import { serviceWorkerResponse } from "@repo/web-shared/layout/mobile";

/** 서비스 워커 `/m/sw.js` — 범위 `/m/`(`FE-REQ-071` FR-4). 판은 빌드 시각 */
export const dynamic = "force-static";
export const GET = () => serviceWorkerResponse(process.env.MOBILE_SW_VERSION ?? "dev");
