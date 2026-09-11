"use client";

// 클라이언트 잎: 클릭 시 대기 상태를 갖는다.
import { useState, type AnchorHTMLAttributes, type ReactNode } from "react";
import { isCrossZonePath } from "@/shared/config";
import { NAVIGATION_MESSAGES } from "@/shared/i18n";

type CrossZoneLinkProps = Omit<
  AnchorHTMLAttributes<HTMLAnchorElement>,
  "href"
> & {
  href: string;
  children: ReactNode;
  /** 이동 중에 보여줄 문구. hard navigation 이라 체감 지연이 있다. */
  pendingLabel?: string;
};

/**
 * zone 을 넘는 링크 (FE-REQ-007 FR-5 · FR-21).
 *
 * **자체 호스팅 기준이다.** 순수 Multi-Zones 이므로 zone 간 이동은 hard navigation 이고,
 * 그 대가를 그대로 안는다. 대신 클릭 직후 로딩 상태를 노출해 체감 지연을 알린다.
 *
 * > **Vercel 로 옮길 때(FR-20) 바꾸는 곳은 이 파일 하나다.**
 * > `@vercel/microfrontends` 의 확장 `Link` 로 내부 구현을 교체하고, 루트에
 * > `PrefetchCrossZoneLinksProvider` 를 건다. 호출부는 그대로 둔다.
 */
export const CrossZoneLink = ({
  href,
  children,
  pendingLabel = NAVIGATION_MESSAGES.crossZonePending,
  onClick,
  ...rest
}: CrossZoneLinkProps) => {
  const [isPending, setIsPending] = useState(false);

  if (process.env.NODE_ENV !== "production" && !isCrossZonePath(href)) {
    console.warn(
      `CrossZoneLink 에 같은 zone 경로('${href}')가 들어왔다. 같은 zone 이면 next/link 의 <Link> 를 써야 soft navigation 이 된다.`
    );
  }

  return (
    <a
      {...rest}
      href={href}
      aria-busy={isPending || undefined}
      onClick={(event) => {
        onClick?.(event);
        if (event.defaultPrevented) return;
        // 새 탭·수정키 클릭은 현재 문서가 그대로 남으므로 대기 상태를 켜지 않는다.
        if (
          event.metaKey ||
          event.ctrlKey ||
          event.shiftKey ||
          event.altKey ||
          rest.target === "_blank"
        ) {
          return;
        }
        setIsPending(true);
      }}
    >
      {children}
      {isPending ? (
        <span role="status" style={{ marginLeft: 8, fontSize: 12 }}>
          {pendingLabel}
        </span>
      ) : null}
    </a>
  );
};

export default CrossZoneLink;
