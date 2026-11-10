import { describe, expect, it, vi } from "vitest";

import { singleFlight, withSessionRefresh } from "./authRefresh";

/**
 * 401 → 갱신 → 1회 재시도 (`FE-REQ-013` FR-80 2단계 — 토큰은 httpOnly 쿠키).
 *
 * 가짜 `fetch` 는 호출마다 미리 정한 status 를 돌려준다. 확인하는 것은 **몇 번 보냈는가 · 갱신을 몇 번 불렀나**다.
 * 경계는 표 하나다 — (보낼 때 세션 · 첫 응답 · 갱신 결과 · 재시도 응답) → (보낸 수 · 갱신 수 · 최종 status).
 */

const recordingFetch = (statuses: number[]) => {
  const seen: RequestInit[] = [];
  const fetchImpl = vi.fn(async (_input: RequestInfo | URL, init?: RequestInit) => {
    seen.push(init ?? {});
    return new Response(null, { status: statuses[seen.length - 1] ?? 200 });
  }) as unknown as typeof fetch;
  return { seen, fetchImpl };
};

interface Row {
  name: string;
  signedIn: boolean;
  statuses: number[];
  refreshed: boolean;
  sends: number;
  refreshes: number;
  final: number;
}

const ROWS: Row[] = [
  { name: "200 이면 갱신하지 않는다", signedIn: true, statuses: [200], refreshed: true, sends: 1, refreshes: 0, final: 200 },
  { name: "401 이면 갱신하고 한 번 다시 보낸다", signedIn: true, statuses: [401, 200], refreshed: true, sends: 2, refreshes: 1, final: 200 },
  { name: "재시도도 401 이면 그대로 — 무한 재시도 없음", signedIn: true, statuses: [401, 401], refreshed: true, sends: 2, refreshes: 1, final: 401 },
  { name: "갱신 실패면 401 그대로 — 다시 보내지 않는다", signedIn: true, statuses: [401], refreshed: false, sends: 1, refreshes: 1, final: 401 },
  { name: "세션 없이 보낸 401 은 갱신 대상이 아니다", signedIn: false, statuses: [401], refreshed: true, sends: 1, refreshes: 0, final: 401 },
  { name: "403 은 갱신 대상이 아니다", signedIn: true, statuses: [403], refreshed: true, sends: 1, refreshes: 0, final: 403 },
];

/**
 * 게스트 발급(`FE-REQ-070` FR-2) — (보낼 때 세션 · 갱신 뒤 세션 · 첫 응답 · 갱신 · 발급) → (보낸 수 · 발급 수 · 최종).
 * 불변식: 보낸 수 ≤ 2 · 세션이 남아 있으면 게스트로 내리지 않는다 · 401 이 아니면 아무것도 안 한다.
 */
interface GuestRow {
  name: string;
  signedIn: boolean;
  signedInAfter: boolean;
  statuses: number[];
  refreshed: boolean;
  issued: boolean;
  sends: number;
  issues: number;
  final: number;
}

const GUEST_ROWS: GuestRow[] = [
  { name: "로그인 없이 401 → 게스트 받고 한 번 다시", signedIn: false, signedInAfter: false, statuses: [401, 200], refreshed: false, issued: true, sends: 2, issues: 1, final: 200 },
  { name: "발급 실패면 401 그대로", signedIn: false, signedInAfter: false, statuses: [401], refreshed: false, issued: false, sends: 1, issues: 1, final: 401 },
  { name: "게스트로 다시 보내도 401 이면 그대로(사람 경로) — 무한 없음", signedIn: false, signedInAfter: false, statuses: [401, 401], refreshed: false, issued: true, sends: 2, issues: 1, final: 401 },
  { name: "세션이 죽었다(갱신 실패 · 세션 비움) → 게스트", signedIn: true, signedInAfter: false, statuses: [401, 200], refreshed: false, issued: true, sends: 2, issues: 1, final: 200 },
  { name: "갱신 실패인데 세션이 남았다(네트워크) → 게스트로 내리지 않는다", signedIn: true, signedInAfter: true, statuses: [401], refreshed: false, issued: true, sends: 1, issues: 0, final: 401 },
  { name: "갱신 성공이면 게스트를 부르지 않는다", signedIn: true, signedInAfter: true, statuses: [401, 200], refreshed: true, issued: true, sends: 2, issues: 0, final: 200 },
  { name: "200 이면 아무것도", signedIn: false, signedInAfter: false, statuses: [200], refreshed: false, issued: true, sends: 1, issues: 0, final: 200 },
];

describe("withSessionRefresh — 게스트", () => {
  it.each(GUEST_ROWS)("$name", async (row) => {
    const { fetchImpl, seen } = recordingFetch(row.statuses);
    let signedIn = row.signedIn;
    const issueGuest = vi.fn(async () => row.issued);
    const response = await withSessionRefresh({
      fetchImpl,
      hasSession: () => signedIn,
      refreshSession: async () => {
        signedIn = row.signedInAfter;
        return row.refreshed;
      },
      issueGuest,
    })("/api/app/x");
    expect(seen).toHaveLength(row.sends);
    expect(issueGuest).toHaveBeenCalledTimes(row.issues);
    expect(response.status).toBe(row.final);
  });
});

describe("withSessionRefresh", () => {
  it.each(ROWS)("$name", async (row) => {
    const { fetchImpl, seen } = recordingFetch(row.statuses);
    const refreshSession = vi.fn(async () => row.refreshed);

    const response = await withSessionRefresh({ fetchImpl, hasSession: () => row.signedIn, refreshSession })("/api/app/x");

    expect(seen).toHaveLength(row.sends);
    expect(refreshSession).toHaveBeenCalledTimes(row.refreshes);
    expect(response.status).toBe(row.final);
  });

  it("세션은 **보내기 전에** 읽는다 — 응답 중에 지워져도(다른 탭 로그아웃) 그 요청은 세션 요청이다", async () => {
    let signedIn = true;
    const { fetchImpl, seen } = recordingFetch([401, 200]);
    const wrapped = withSessionRefresh({
      fetchImpl: (async (input: RequestInfo | URL, init?: RequestInit) => {
        const res = await fetchImpl(input, init);
        signedIn = false;
        return res;
      }) as typeof fetch,
      hasSession: () => signedIn,
      refreshSession: async () => true,
    });

    expect((await wrapped("/api/app/x")).status).toBe(200);
    expect(seen).toHaveLength(2);
  });

  it("재시도는 같은 `init` 이다 — 새 토큰은 쿠키가 싣는다", async () => {
    const { fetchImpl, seen } = recordingFetch([401, 200]);

    await withSessionRefresh({ fetchImpl, hasSession: () => true, refreshSession: async () => true })("/api/app/x", {
      method: "POST",
      body: '{"a":1}',
    });

    expect(seen[1]?.method).toBe("POST");
    expect(seen[1]?.body).toBe('{"a":1}');
  });
});

describe("singleFlight", () => {
  it("동시에 부르면 한 번만 실행한다", async () => {
    let resolve: ((value: string) => void) | undefined;
    const run = vi.fn(
      () =>
        new Promise<string>((res) => {
          resolve = res;
        })
    );
    const shared = singleFlight(run);

    const [a, b, c] = [shared(), shared(), shared()];
    resolve?.("token");

    expect(await Promise.all([a, b, c])).toEqual(["token", "token", "token"]);
    expect(run).toHaveBeenCalledTimes(1);
  });

  it("끝난 뒤에는 다시 실행한다 — 다음 만료를 갱신해야 한다", async () => {
    const run = vi.fn(async () => "token");
    const shared = singleFlight(run);

    await shared();
    await shared();

    expect(run).toHaveBeenCalledTimes(2);
  });

  it("실패한 뒤에도 다시 실행할 수 있다", async () => {
    const run = vi
      .fn<() => Promise<string>>()
      .mockRejectedValueOnce(new Error("network"))
      .mockResolvedValueOnce("token");
    const shared = singleFlight(run);

    await expect(shared()).rejects.toThrow("network");
    expect(await shared()).toBe("token");
  });
});
