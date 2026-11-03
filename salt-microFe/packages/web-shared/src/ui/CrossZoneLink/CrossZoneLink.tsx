"use client";

// 클라이언트 잎: 클릭 시 대기 상태를 갖는다.
import { useState, type AnchorHTMLAttributes, type ReactNode } from "react";
import { isCrossZonePath, ZONE_APP } from "../../config";
import { NAVIGATION_MESSAGES } from "../../i18n";

type CrossZoneLinkProps = Omit<
  AnchorHTMLAttributes<HTMLAnchorElement>,
  "href"
> & {
  href: string;
  children: ReactNode;
  /** 이동 중에 보여줄 문구. hard navigation 이라 체감 지연이 있다. */
  pendingLabel?: string;
  /** 대기 문구를 링크 안에 그릴까 — 칸 크기가 고정된 자리(앱 탭)는 끈다(`aria-busy` 는 그대로) */
  showPending?: boolean;
};

/**
 * 이 클릭이 지금 문서를 떠나지 않는가 — 새 탭 · 수정키 · 가운데 · 오른쪽 클릭. 그때는 대기 상태 · 계측을 켜지 않는다.
 */
export const opensElsewhere = (
  event: { metaKey: boolean; ctrlKey: boolean; shiftKey: boolean; altKey: boolean; button: number },
  target?: string,
): boolean =>
  event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || event.button !== 0 || target === "_blank";

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
  showPending = true,
  onClick,
  ...rest
}: CrossZoneLinkProps) => {
  const [isPending, setIsPending] = useState(false);

  if (process.env.NODE_ENV !== "production" && !isCrossZonePath(href, ZONE_APP)) {
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
        if (opensElsewhere(event, rest.target)) return;
        setIsPending(true);
      }}
    >
      {children}
      {isPending && showPending ? (
        <span role="status" style={{ marginLeft: 8, fontSize: 12 }}>
          {pendingLabel}
        </span>
      ) : null}
    </a>
  );
};

export default CrossZoneLink;
