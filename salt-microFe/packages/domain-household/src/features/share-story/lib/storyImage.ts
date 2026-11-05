import { plainLine, type StoryText } from "@/entities/household";

/**
 * 이야기 카드 → PNG(가계부 S1g). 화면에 그리지 않는다 — 누를 때 화면 밖 캔버스에 한 번 그려 파일로 내보내고 버린다.
 * 화면의 카드는 DOM 이다(`canvas.md` — 카드를 캔버스로 그리지 않는다). 이 캔버스는 래스터 파일을 만드는 자리라 같은 규칙의 도입 대상이 아니다.
 * 글자 · 색 · 글꼴은 화면 카드의 계산된 값을 읽는다 — 문장은 `storyText` 하나, 색은 토큰 하나(두 곳에 적지 않는다).
 */
const WIDTH = 540;
const PAD = 40;
const TITLE_PX = 26;
const LINE_PX = 18;
const LINE_GAP = 14;
const SCALE = 2;

/** 폭에 맞춰 낱말 단위로 줄을 나눈다(한국어는 띄어쓰기 단위) */
const wrap = (ctx: CanvasRenderingContext2D, text: string, max: number): string[] => {
  const out: string[] = [];
  let row = "";
  for (const word of text.split(" ")) {
    const next = row === "" ? word : `${row} ${word}`;
    if (row !== "" && ctx.measureText(next).width > max) {
      out.push(row);
      row = word;
    } else row = next;
  }
  if (row !== "") out.push(row);
  return out;
};

export const storyImage = async (text: StoryText, card: HTMLElement, emptyLine: string): Promise<Blob> => {
  const style = getComputedStyle(card);
  const font = style.fontFamily;
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("canvas unavailable");

  const lines = text.lines.length > 0 ? text.lines.map(plainLine) : [emptyLine];
  const inner = WIDTH - PAD * 2;
  ctx.font = `400 ${LINE_PX}px ${font}`;
  const rows = lines.map((l) => wrap(ctx, l, inner));
  const lineHeight = Math.round(LINE_PX * 1.5);
  const bodyHeight = rows.reduce((h, r) => h + r.length * lineHeight, 0) + LINE_GAP * (rows.length - 1);
  const height = PAD + Math.round(TITLE_PX * 1.4) + 20 + bodyHeight + PAD;

  canvas.width = WIDTH * SCALE;
  canvas.height = height * SCALE;
  ctx.scale(SCALE, SCALE);
  ctx.fillStyle = style.backgroundColor;
  ctx.fillRect(0, 0, WIDTH, height);
  ctx.fillStyle = style.color;
  ctx.textBaseline = "top";
  ctx.font = `700 ${TITLE_PX}px ${font}`;
  ctx.fillText(text.title, PAD, PAD);
  ctx.font = `400 ${LINE_PX}px ${font}`;
  let y = PAD + Math.round(TITLE_PX * 1.4) + 20;
  rows.forEach((r) => {
    r.forEach((row) => {
      ctx.fillText(row, PAD, y);
      y += lineHeight;
    });
    y += LINE_GAP;
  });

  return new Promise((resolve, reject) => canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error("toBlob failed"))), "image/png"));
};
