import Link from "next/link";

import { EmptyState } from "@repo/ui/emptyState";
import { ROUTES } from "@repo/web-shared/config";
import { NavChevron } from "@repo/web-shared/ui";
import { panelDescription, panelTitle } from "@repo/web-shared/ui/surface.css";

import { formatTipDate, publicTipsApi, TipStatus } from "@/entities/tip";

import { TIPS_PAGE as M, tipsMetadata } from "../model";
import * as s from "./tips.css";

/** `/tips` 색인 여부 — 서버 공개 플래그로(목록 응답 하나를 메타데이터와 화면이 같이 쓴다 — 같은 fetch 는 Next 가 한 번만 부른다) */
export const generateMetadata = async () => tipsMetadata(Boolean((await publicTipsApi.list())?.public));

/** 금융 팁 목록 `/tips`(`FE-REQ-058` FR-1) — 서버 컴포넌트 · ISR. 공개 전이면 "준비 중" 한 줄 */
export const TipsPage = async () => {
  const list = await publicTipsApi.list();
  return (
    <div className={s.page}>
      <h1 className={panelTitle}>{M.title}</h1>
      <p className={panelDescription}>{M.description}</p>
      {!list?.public ? (
        <EmptyState title={M.notPublicTitle} description={M.notPublicDescription} />
      ) : list.tips.length === 0 ? (
        <EmptyState title={M.emptyTitle} />
      ) : (
        <ul className={s.list}>
          {list.tips.map((tip) => (
            <li key={tip.slug}>
              <Link href={ROUTES.tip(tip.slug)} className={s.item}>
                <span className={s.itemText}>
                  <span className={s.itemTitle}>{tip.title}</span>
                  <span className={s.itemSummary}>{tip.summary}</span>
                  <span className={s.itemMeta}>
                    {tip.status === TipStatus.NeedsCheck ? <span className={s.badge}>{M.needsCheck}</span> : null}
                    {M.validUntil} {formatTipDate(tip.meta.validUntil)} · {tip.meta.sourceName}
                  </span>
                </span>
                <NavChevron />
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

export default TipsPage;
