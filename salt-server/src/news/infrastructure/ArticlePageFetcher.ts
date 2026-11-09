import { lookup as dnsLookup, type LookupAddress } from "node:dns";
import http from "node:http";
import https from "node:https";
import { isIP } from "node:net";

import { Readability } from "@mozilla/readability";
import { parseHTML } from "linkedom";

import { createHttpClient } from "../../shared/infrastructure/httpClient";
import type { ArticlePagePort } from "../domain";

/** 받는 페이지 상한 — 기사 HTML 은 크게 잡아도 1~2MB */
const MAX_BYTES = 3 * 1024 * 1024;

/**
 * 사설 · 루프백 · 링크 로컬 주소 — 검색 결과의 주소는 남이 정한 값이라 서버 안쪽을 부르게 두지 않는다(SSRF).
 * 판정은 DNS 를 푼 **실제 주소**로 한다(리다이렉트 · DNS 재바인딩도 같은 길을 지난다)
 */
export const isPrivateAddress = (address: string): boolean => {
  if (isIP(address) === 4) {
    const [a, b] = address.split(".").map(Number) as [number, number];
    return (
      a === 0 || a === 10 || a === 127 || (a === 169 && b === 254) || (a === 172 && b >= 16 && b <= 31) ||
      (a === 192 && b === 168) || (a === 100 && b >= 64 && b <= 127) || a >= 224
    );
  }
  const v6 = address.toLowerCase();
  if (v6.startsWith("::ffff:")) return isPrivateAddress(v6.slice(7));
  return v6 === "::" || v6 === "::1" || v6.startsWith("fc") || v6.startsWith("fd") || v6.startsWith("fe80");
};

/** 공인 주소만 통과시키는 DNS 조회 — 에이전트에 꽂아 모든 연결(리다이렉트 포함)이 지난다 */
const publicLookup = ((hostname: string, options: object, callback: (...args: unknown[]) => void) => {
  dnsLookup(hostname, { ...options, all: true }, (err, addresses) => {
    if (err) return callback(err);
    const list = addresses as LookupAddress[];
    if (list.length === 0 || list.some((a) => isPrivateAddress(a.address))) {
      return callback(Object.assign(new Error("blocked address"), { code: "EBLOCKED" }));
    }
    const wantsAll = (options as { all?: boolean }).all === true;
    return wantsAll ? callback(null, list) : callback(null, list[0]!.address, list[0]!.family);
  });
}) as unknown as typeof dnsLookup;

/** 응답 바이트를 글자로 — 머리 · 메타의 문자셋(국내 옛 언론사는 EUC-KR). 모르는 이름이면 UTF-8 */
export const decodeHtml = (bytes: Buffer, contentType: string | undefined): string => {
  const head = bytes.subarray(0, 4096).toString("latin1");
  const label =
    contentType?.match(/charset=["']?([\w-]+)/i)?.[1] ?? head.match(/<meta[^>]+charset=["']?([\w-]+)/i)?.[1] ?? "utf-8";
  try {
    return new TextDecoder(label.toLowerCase()).decode(bytes);
  } catch {
    return new TextDecoder("utf-8").decode(bytes);
  }
};

/** 블록 하나를 문단들로 — `<br>` 두 줄 · 블록 태그를 문단 경계로. 글자만 남긴다 */
const BLOCKS = "p, div, li, blockquote, h2, h3, h4, figcaption, table";

/** 쓰는 만큼만의 DOM 모양 — 서버 타입 설정에 DOM 라이브러리가 없다(linkedom 노드가 이 모양이다) */
interface DomNode {
  textContent: string | null;
  querySelector(selector: string): DomNode | null;
  querySelectorAll(selector: string): Iterable<DomNode> & { forEach(cb: (n: DomNode) => void): void };
  remove(): void;
  replaceWith(text: string): void;
  append(text: string): void;
}

const paragraphsOf = (root: DomNode): string[] => {
  // 사진 · 사진 설명(포털은 표 한 칸 · 언론사는 figure) · 스크립트 · 버튼은 글자가 아니다
  root
    .querySelectorAll("script, style, noscript, iframe, figure, figcaption, button, table.nbd_table, .end_photo_org, .img_desc, .vod_player_wrap")
    .forEach((n) => n.remove());
  root.querySelectorAll("br").forEach((br) => br.replaceWith("\n"));
  // 블록 끝마다 줄바꿈 — 본문 칸이 글자를 직접 품고(포털) 블록이 섞여 있어도 순서대로 한 줄씩 나온다
  root.querySelectorAll(BLOCKS).forEach((el) => el.append("\n"));
  return (root.textContent ?? "").split(/\n/).map((t) => t.trim()).filter(Boolean);
};

/**
 * 기사 페이지 → 본문 문단(`SRV-REQ-054` FR-2) — 포털이 품은 기사는 본문 칸(`#dic_area`), 언론사 원문은 읽기 모드 추출(Readability).
 * 타임아웃 8초 · 3MB · 리다이렉트 3번 · 공인 주소만. 받지 못하면 던진다 · 본문이 없으면 빈 배열
 */
export class ArticlePageFetcher implements ArticlePagePort {
  private readonly http = createHttpClient({
    timeoutMs: 8_000,
    headers: { "User-Agent": "Mozilla/5.0 (compatible; SaltReader/1.0)", Accept: "text/html" },
  });

  private readonly agents = {
    httpAgent: new http.Agent({ lookup: publicLookup }),
    httpsAgent: new https.Agent({ lookup: publicLookup }),
  };

  async paragraphs(url: string, portal: boolean): Promise<string[]> {
    const parsed = new URL(url);
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") return [];
    if (isIP(parsed.hostname) && isPrivateAddress(parsed.hostname)) return [];
    const res = await this.http.get<ArrayBuffer>(url, {
      ...this.agents,
      responseType: "arraybuffer",
      maxContentLength: MAX_BYTES,
      maxRedirects: 3,
    });
    return extractParagraphs(decodeHtml(Buffer.from(res.data), res.headers["content-type"] as string | undefined), portal);
  }
}

/** HTML → 본문 문단 — 포털이 품은 기사는 본문 칸, 그 밖은 읽기 모드 추출. 본문이 없으면 빈 배열(정리 규칙은 도메인 `cleanParagraphs`) */
export const extractParagraphs = (html: string, portal: boolean): string[] => {
  const { document } = parseHTML(html);
  if (portal) {
    const area = document.querySelector("#dic_area, #newsct_article, #articleBodyContents");
    return area ? paragraphsOf(area as unknown as DomNode) : [];
  }
  const article = new Readability(document as unknown as Document, { charThreshold: 200 }).parse();
  if (!article?.content) return [];
  const { document: body } = parseHTML(`<!doctype html><html><body>${article.content}</body></html>`);
  return paragraphsOf(body.body as unknown as DomNode);
};
