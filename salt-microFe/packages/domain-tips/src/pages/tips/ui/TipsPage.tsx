import Link from "next/link";

import { StatusLine } from "@repo/ui/statusLine";
import { ROUTES } from "@repo/web-shared/config";
import { NavChevron, PageFrame } from "@repo/web-shared/ui/frame";

import { formatTipDate, publicTipsApi, TIP_MESSAGES, TipsCollectSide, TipStatus, type TipSummary } from "@/entities/tip";
import { TipsForMeSlot } from "@/features/tips-for-me";

import { TIPS_PAGE as M, tipsMetadata } from "../model";
import * as s from "./tips.css";

/** `/tips` 색인 여부 — 서버 공개 플래그로(목록 응답 하나를 메타데이터와 화면이 같이 쓴다 — 같은 fetch 는 Next 가 한 번만 부른다) */
export const generateMetadata = async () => tipsMetadata(Boolean((await publicTipsApi.list())?.public));

/**
 * 글 한 줄 — 왼쪽 제목 14/600 · 요약 13 두 줄 · 출처 12/500 / 오른쪽 유효기한 12/500 한 줄(1024 미만은 출처 옆) · 셰브론.
 * 출처를 오른쪽 칸에 두면 법령 이름이 세 줄로 접혔다(2026-11-20 1440 실화면) — 긴 글은 왼쪽 단, 오른쪽은 짧은 날짜 하나
 */
const TipRow = ({ tip }: { tip: TipSummary }) => {
  const needsCheck = tip.status === TipStatus.NeedsCheck;
  const validUntil = `${M.validUntil} ${formatTipDate(tip.meta.validUntil)}`;
  return (
    <li className={s.rowItem}>
      <Link href={ROUTES.tip(tip.slug)} className={s.row}>
        <span className={s.rowText}>
          <span className={s.rowTitle}>
            {needsCheck ? <span className={s.badge}>{M.needsCheck}</span> : null}
            {tip.title}
          </span>
          <span className={s.rowSummary}>{tip.summary}</span>
          <span className={s.rowMeta}>
            {tip.meta.sourceName}
            <span className={s.rowMetaInline}> · {validUntil}</span>
          </span>
        </span>
        <span className={s.rowTrailing}>{validUntil}</span>
        <NavChevron />
      </Link>
    </li>
  );
};

/**
 * 금융 팁 목록 `/tips`(`FE-REQ-058` FR-1 → `FE-REQ-060` FR-10) — 서버 컴포넌트 · ISR. 데스크톱 틀(`PageFrame`) + 목록 행 +
 * 오른쪽 사이드(모아 보기 · 내게 맞춘 팁 — 로그인한 사람에게만 부르는 잎). 공개 전이면 패널 안 한 줄. 금액 0
 */
export const TipsPage = async () => {
  const list = await publicTipsApi.list();
  const isPublic = Boolean(list?.public);
  return (
    <PageFrame
      title={M.title}
      sideLabel={TIP_MESSAGES.sideLabel}
      side={
        isPublic ? (
          <>
            <TipsCollectSide />
            <TipsForMeSlot />
          </>
        ) : undefined
      }
    >
      <p className={s.description}>{M.description}</p>
      {!list?.public ? (
        <StatusLine kind="empty">{`${M.notPublicTitle} — ${M.notPublicDescription}`}</StatusLine>
      ) : list.tips.length === 0 ? (
        <StatusLine kind="empty">{M.emptyTitle}</StatusLine>
      ) : (
        <ul className={s.list} aria-label={M.listLabel}>
          {list.tips.map((tip) => (
            <TipRow key={tip.slug} tip={tip} />
          ))}
        </ul>
      )}
    </PageFrame>
  );
};

export default TipsPage;
