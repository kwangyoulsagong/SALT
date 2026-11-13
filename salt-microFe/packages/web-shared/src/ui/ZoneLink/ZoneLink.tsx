import Link from "next/link";
import type { ReactNode } from "react";

import { isCrossZonePath, ZONE_APP } from "../../config";
import { CrossZoneLink } from "../CrossZoneLink/CrossZoneLink";

interface ZoneLinkProps {
  href: string;
  className?: string;
  "aria-label"?: string;
  /** 누른 순간 — 계측처럼 이동을 막지 않는 일만(`FE-REQ-055` FR-8 홈 카드) */
  onClick?: () => void;
  children: ReactNode;
}

/**
 * 경로가 어느 zone 인지 몰라도 되는 링크 (`FE-REQ-053`).
 *
 * 같은 zone 이면 `<Link>`(soft navigation), 다른 zone 이면 `CrossZoneLink`(`<a>` 문서 이동). 판정은 레지스트리 하나 ·
 * 실행 중인 앱 기준(`ZONE_APP`) — 화면이 셸에 있다가 zone 으로 옮겨 가도(`hostedIn`) 호출부를 고치지 않는다.
 * 경로가 서버에서 오는 자리(홈 카드 `href`)와 옮겨 가는 도중의 경로에 쓴다. 고정 경로는 둘 중 하나를 직접 쓴다.
 */
export const ZoneLink = ({ href, children, ...rest }: ZoneLinkProps) =>
  isCrossZonePath(href, ZONE_APP) ? (
    <CrossZoneLink href={href} {...rest}>
      {children}
    </CrossZoneLink>
  ) : (
    <Link href={href} {...rest}>
      {children}
    </Link>
  );
