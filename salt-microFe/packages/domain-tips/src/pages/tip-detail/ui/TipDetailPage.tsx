import Link from "next/link";
import { notFound } from "next/navigation";

import { ROUTES } from "@repo/web-shared/config";
import { backLink } from "@repo/web-shared/ui/surface.css";

import { NeedsCheckBand, publicTipsApi, RevisionList, TIP_MESSAGES, TipBody, TipMetaList, TipStatus } from "@/entities/tip";

import { TIP_DETAIL_PAGE as M, tipMetadata } from "../model";
import * as s from "./tipDetail.css";

type Params = { params: Promise<{ slug: string }> };

export const generateMetadata = async ({ params }: Params) => tipMetadata(await publicTipsApi.detail((await params).slug));

/**
 * 금융 팁 글 `/tips/[slug]`(`FE-REQ-058` FR-1 · FR-2 · FR-4 첫 판) — 서버 컴포넌트 · ISR. 개인 데이터 0.
 * 메타 다섯 칸 항상 · 확인 필요 띠 · 본문 · 공식 링크 하나 · 바뀐 것. 없거나 공개 전이면 404.
 */
export const TipDetailPage = async ({ params }: Params) => {
  const tip = await publicTipsApi.detail((await params).slug);
  if (!tip) notFound();
  return (
    <div className={s.page}>
      <Link href={ROUTES.tips} className={backLink}>
        {M.back}
      </Link>
      <h1 className={s.title}>{tip.title}</h1>
      <p className={s.summary}>{tip.summary}</p>
      {tip.status === TipStatus.NeedsCheck ? <NeedsCheckBand /> : null}
      <TipMetaList meta={tip.meta} />
      <TipBody blocks={tip.body} />
      <a className={s.official} href={tip.meta.sourceUrl} target="_blank" rel="noopener noreferrer">
        {M.officialLink}
      </a>
      <p className={s.disclaimer}>{TIP_MESSAGES.disclaimer}</p>
      {tip.revisions.length > 0 ? (
        <section className={s.section}>
          <h2 className={s.sectionTitle}>{TIP_MESSAGES.revisions}</h2>
          <RevisionList revisions={tip.revisions} />
        </section>
      ) : null}
    </div>
  );
};

export default TipDetailPage;
