import { TIP_MESSAGES as M } from "../model/messages";
import { formatTipDate } from "../model/format";
import type { TipMeta } from "../model/types";
import * as s from "./tip.css";

/** 메타 다섯 칸 — 글마다 **항상** 보인다(FE-REQ-058 FR-1). 출처는 공식 페이지 하나(새 탭) */
export const TipMetaList = ({ meta }: { meta: TipMeta }) => (
  <dl className={s.meta}>
    <dt className={s.metaName}>{M.source}</dt>
    <dd className={s.metaValue}>
      <a className={s.sourceLink} href={meta.sourceUrl} target="_blank" rel="noopener noreferrer">
        {meta.sourceName}
      </a>
    </dd>
    <dt className={s.metaName}>{M.baseYear}</dt>
    <dd className={s.metaValue}>{M.baseYearValue(meta.baseYear)}</dd>
    <dt className={s.metaName}>{M.writtenOn}</dt>
    <dd className={s.metaValue}>{formatTipDate(meta.writtenOn)}</dd>
    <dt className={s.metaName}>{M.reviewedOn}</dt>
    <dd className={s.metaValue}>{formatTipDate(meta.reviewedOn)}</dd>
    <dt className={s.metaName}>{M.validUntil}</dt>
    <dd className={s.metaValue}>{formatTipDate(meta.validUntil)}</dd>
  </dl>
);
