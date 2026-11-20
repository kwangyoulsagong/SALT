import { notFound } from "next/navigation";

import { ROUTES } from "@repo/web-shared/config";
import { BackNav, PageFrame } from "@repo/web-shared/ui/frame";

import { NeedsCheckBand, publicTipsApi, RevisionList, TIP_MESSAGES, TipBody, TipMetaList, TipsCollectSide, TipStatus } from "@/entities/tip";
import { AnswerQuiz } from "@/features/answer-quiz";
import { MyNumbersSlot } from "@/features/read-my-numbers";
import { TipsForMeSlot } from "@/features/tips-for-me";

import { TIP_DETAIL_PAGE as M, tipMetadata } from "../model";
import * as s from "./tipDetail.css";

type Params = { params: Promise<{ slug: string }> };

export const generateMetadata = async ({ params }: Params) => tipMetadata(await publicTipsApi.detail((await params).slug));

/**
 * 금융 팁 글 `/tips/[slug]`(`FE-REQ-058` FR-1 · FR-2 · FR-3 · FR-4 · FR-5 → `FE-REQ-060` FR-10) — 서버 컴포넌트 · ISR. 개인 데이터 0.
 * 데스크톱 틀: 뒤로(금융 팁 › 제목) · 제목 18/700 → 글 한 단(최대 720) + 오른쪽 사이드(모아 보기 · 내게 맞춘 팁). 1024 미만은 사이드가 글 아래.
 * 메타 다섯 칸 항상 · 확인 필요 띠 · 읽기 전에 맞혀 보기(있으면) · 본문 · 내 숫자로 다시 읽기(있으면) · 공식 링크 하나 · 바뀐 것. 없거나 공개 전이면 404.
 */
export const TipDetailPage = async ({ params }: Params) => {
  const tip = await publicTipsApi.detail((await params).slug);
  if (!tip) notFound();
  return (
    <PageFrame
      sideLabel={TIP_MESSAGES.sideLabel}
      side={
        <>
          <TipsCollectSide />
          <TipsForMeSlot exclude={tip.slug} />
        </>
      }
    >
      <div className={s.article}>
        <BackNav
          label={M.back}
          trailLabel={M.trailLabel}
          fallbackHref={ROUTES.tips}
          crumbs={[{ label: M.trailTips, href: ROUTES.tips }, { label: tip.title }]}
        />
        <h1 className={s.title}>{tip.title}</h1>
        <p className={s.summary}>{tip.summary}</p>
        {tip.status === TipStatus.NeedsCheck ? <NeedsCheckBand /> : null}
        <TipMetaList meta={tip.meta} />
        {tip.quiz ? <AnswerQuiz slug={tip.slug} quiz={tip.quiz} /> : null}
        <TipBody blocks={tip.body} />
        {tip.myNumbers ? <MyNumbersSlot slug={tip.slug} /> : null}
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
    </PageFrame>
  );
};

export default TipDetailPage;
