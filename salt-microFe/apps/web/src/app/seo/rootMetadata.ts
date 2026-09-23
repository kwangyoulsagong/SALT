import type { Metadata } from "next";

import { SITE_DESCRIPTION, SITE_NAME, SITE_TAGLINE, SITE_URL } from "@/shared/config";

/**
 * 루트 메타데이터 — 모든 페이지의 기본값.
 *
 * `metadataBase` 가 있어야 페이지의 canonical · Open Graph 상대 주소가 절대 주소가 된다.
 * 제목은 템플릿 `"%s | SALT"` — 페이지는 자기 이름만 준다.
 */
export const rootMetadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: { default: `${SITE_NAME} — ${SITE_TAGLINE}`, template: `%s | ${SITE_NAME}` },
  description: SITE_DESCRIPTION,
  applicationName: SITE_NAME,
  openGraph: {
    type: "website",
    siteName: SITE_NAME,
    locale: "ko_KR",
    title: `${SITE_NAME} — ${SITE_TAGLINE}`,
    description: SITE_DESCRIPTION,
  },
  twitter: { card: "summary" },
};
