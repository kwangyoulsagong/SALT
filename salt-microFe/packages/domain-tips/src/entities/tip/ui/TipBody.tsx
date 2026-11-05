import { TipBlockType, type TipBlock } from "../model/types";
import * as s from "./tip.css";

/** 본문 — 서버가 준 구조(제목줄 · 문단 · 목록)를 요소로. HTML 문자열을 끼우지 않는다(주입 0) */
export const TipBody = ({ blocks }: { blocks: TipBlock[] }) => (
  <div className={s.body}>
    {blocks.map((block, i) =>
      block.type === TipBlockType.Bullets ? (
        <ul key={i} className={s.bullets}>
          {block.items.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      ) : block.type === TipBlockType.Heading ? (
        <h2 key={i} className={s.heading}>
          {block.text}
        </h2>
      ) : (
        <p key={i} className={s.paragraph}>
          {block.text}
        </p>
      ),
    )}
  </div>
);
