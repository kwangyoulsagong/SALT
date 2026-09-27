/**
 * 임시 점검 — 한국투자증권 Open API 국내 주식 시세가 **실시간으로 오는지**.
 * 1) 접근 토큰 2) 현재가 REST 3) 실시간 접속키 → WebSocket 체결가 구독.
 * 주문 · 계좌 API 는 부르지 않는다. 끝나면 지운다.
 */
import "dotenv/config";
import fs from "node:fs";
import WebSocket from "ws";

const BASE = process.env.KIS_BASE_URL ?? "https://openapi.koreainvestment.com:9443";
const WS_URL = process.env.KIS_WS_URL ?? "ws://ops.koreainvestment.com:21000";
const APP_KEY = process.env.KIS_APP_KEY ?? "";
const APP_SECRET = process.env.KIS_APP_SECRET ?? "";
const SYMBOL = process.argv[2] ?? "005930"; // 삼성전자
const TOKEN_CACHE = `${process.env.KIS_TOKEN_CACHE ?? "/tmp"}/kis-token.json`;

if (!APP_KEY || !APP_SECRET) {
  console.error("KIS_APP_KEY / KIS_APP_SECRET 이 .env 에 없다.");
  process.exit(2);
}

const mask = (v: string) => `${v.slice(0, 4)}…(${v.length}자)`;

/** 토큰은 24시간 유효 · 발급은 1분에 1회 — 파일에 캐시해 재실행에도 다시 받지 않는다. */
async function accessToken(): Promise<string> {
  try {
    const cached = JSON.parse(fs.readFileSync(TOKEN_CACHE, "utf8")) as { token: string; expiresAt: number; base: string };
    if (cached.base === BASE && cached.expiresAt > Date.now() + 60_000) return cached.token;
  } catch {}
  const res = await fetch(`${BASE}/oauth2/tokenP`, {
    method: "POST",
    headers: { "content-type": "application/json; charset=utf-8" },
    body: JSON.stringify({ grant_type: "client_credentials", appkey: APP_KEY, appsecret: APP_SECRET }),
  });
  const body = (await res.json()) as Record<string, unknown>;
  if (!res.ok || typeof body.access_token !== "string") {
    throw new Error(`토큰 발급 실패 ${res.status}: ${JSON.stringify(body)}`);
  }
  const expiresIn = Number(body.expires_in ?? 86_400);
  fs.writeFileSync(TOKEN_CACHE, JSON.stringify({ token: body.access_token, expiresAt: Date.now() + expiresIn * 1000, base: BASE }));
  return body.access_token;
}

async function currentPrice(token: string) {
  const url = new URL(`${BASE}/uapi/domestic-stock/v1/quotations/inquire-price`);
  url.searchParams.set("FID_COND_MRKT_DIV_CODE", "J");
  url.searchParams.set("FID_INPUT_ISCD", SYMBOL);
  const res = await fetch(url, {
    headers: {
      "content-type": "application/json; charset=utf-8",
      authorization: `Bearer ${token}`,
      appkey: APP_KEY,
      appsecret: APP_SECRET,
      tr_id: "FHKST01010100",
      custtype: "P",
    },
  });
  const body = (await res.json()) as { rt_cd?: string; msg1?: string; output?: Record<string, string> };
  if (!res.ok || body.rt_cd !== "0" || !body.output) {
    throw new Error(`현재가 조회 실패 ${res.status}: ${JSON.stringify(body).slice(0, 300)}`);
  }
  const o = body.output;
  console.log(`[REST] ${SYMBOL} 현재가 ${Number(o.stck_prpr).toLocaleString()}원 · 전일대비 ${o.prdy_vrss}(${o.prdy_ctrt}%) · 누적거래량 ${Number(o.acml_vol).toLocaleString()} · 시가총액 ${o.hts_avls}억 · 응답 ${new Date().toISOString()}`);
}

async function approvalKey(): Promise<string> {
  const res = await fetch(`${BASE}/oauth2/Approval`, {
    method: "POST",
    headers: { "content-type": "application/json; charset=utf-8" },
    body: JSON.stringify({ grant_type: "client_credentials", appkey: APP_KEY, secretkey: APP_SECRET }),
  });
  const body = (await res.json()) as { approval_key?: string };
  if (!res.ok || !body.approval_key) throw new Error(`실시간 접속키 실패 ${res.status}: ${JSON.stringify(body)}`);
  return body.approval_key;
}

/** 실시간 체결가(H0STCNT0) 를 최대 waitMs 동안 받는다. 장 마감 시간엔 구독 응답만 오고 체결은 안 온다. */
function realtime(approval: string, waitMs: number) {
  return new Promise<void>((resolve) => {
    const ws = new WebSocket(`${WS_URL}/tryitout/H0STCNT0`);
    let ticks = 0;
    const done = (why: string) => {
      console.log(`[WS] 종료 — ${why} · 체결 수신 ${ticks}건`);
      ws.close();
      resolve();
    };
    const timer = setTimeout(() => done(`${waitMs / 1000}초 대기 끝`), waitMs);
    ws.on("open", () => {
      console.log(`[WS] 접속 ${WS_URL}`);
      ws.send(JSON.stringify({
        header: { approval_key: approval, custtype: "P", tr_type: "1", "content-type": "utf-8" },
        body: { input: { tr_id: "H0STCNT0", tr_key: SYMBOL } },
      }));
    });
    ws.on("message", (raw) => {
      const text = raw.toString();
      if (text.startsWith("0|") || text.startsWith("1|")) {
        // 실시간 데이터: 0|tr_id|건수|필드^구분 … (체결시각 · 현재가 · 전일대비 · 등락률 · 체결량 …)
        const [, trId, , payload] = text.split("|");
        const f = payload.split("^");
        ticks += 1;
        console.log(`[WS] ${trId} ${f[0]} 체결시각 ${f[1]} 현재가 ${Number(f[2]).toLocaleString()}원 전일대비 ${f[4]} (${f[5]}%) 체결량 ${f[12]}`);
        if (ticks >= 3) { clearTimeout(timer); done("체결 3건 확인"); }
        return;
      }
      try {
        const msg = JSON.parse(text) as { header?: { tr_id?: string }; body?: { rt_cd?: string; msg1?: string } };
        if (msg.header?.tr_id === "PINGPONG") { ws.pong(); return; }
        console.log(`[WS] 응답 ${msg.header?.tr_id} rt_cd=${msg.body?.rt_cd} ${msg.body?.msg1 ?? ""}`);
      } catch {
        console.log(`[WS] 기타 ${text.slice(0, 120)}`);
      }
    });
    ws.on("error", (e) => { clearTimeout(timer); done(`오류 ${(e as Error).message}`); });
  });
}

(async () => {
  console.log(`KIS ${BASE} · appkey ${mask(APP_KEY)} · 종목 ${SYMBOL}`);
  const token = await accessToken();
  await currentPrice(token);
  const approval = await approvalKey();
  const kst = new Date(Date.now() + 9 * 3600_000);
  const hhmm = kst.getUTCHours() * 100 + kst.getUTCMinutes();
  const marketOpen = kst.getUTCDay() >= 1 && kst.getUTCDay() <= 5 && hhmm >= 900 && hhmm <= 1530;
  console.log(`[WS] KST ${kst.toISOString().slice(0, 16).replace("T", " ")} · 정규장 ${marketOpen ? "중" : "아님 — 체결은 안 올 수 있다(구독 응답만 확인)"}`);
  await realtime(approval, marketOpen ? 15_000 : 8_000);
})().catch((e) => { console.error(String(e)); process.exit(1); });
