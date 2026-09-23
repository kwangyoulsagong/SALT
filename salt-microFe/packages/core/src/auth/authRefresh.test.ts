import { describe, expect, it, vi } from "vitest";

import { singleFlight, withAuthRefresh } from "./authRefresh";

/**
 * 401 → 갱신 → 1회 재시도 (`FE-REQ-013`).
 *
 * 가짜 `fetch` 는 호출마다 미리 정한 status 를 돌려준다. 확인하는 것은 **몇 번 보냈는가**와
 * **두 번째 요청이 새 토큰을 들고 갔는가**다.
 */

const respond = (status: number) => new Response(null, { status });

interface Call {
  input: RequestInfo | URL;
  authorization: string | null;
}

const recordingFetch = (statuses: number[]) => {
  const calls: Call[] = [];
  const fetchImpl = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    calls.push({
      input,
      authorization: new Headers(init?.headers).get("Authorization"),
    });
    return respond(statuses[calls.length - 1] ?? 200);
  }) as unknown as typeof fetch;

  return { calls, fetchImpl };
};

describe("withAuthRefresh", () => {
  it("200 이면 갱신하지 않는다", async () => {
    const { fetchImpl, calls } = recordingFetch([200]);
    const refreshAccessToken = vi.fn(async () => "new-token");

    const response = await withAuthRefresh({ fetchImpl, refreshAccessToken })("/api/app/x", {
      headers: { Authorization: "Bearer old" },
    });

    expect(response.status).toBe(200);
    expect(refreshAccessToken).not.toHaveBeenCalled();
    expect(calls).toHaveLength(1);
  });

  it("401 이면 갱신하고 새 토큰으로 한 번 다시 보낸다", async () => {
    const { fetchImpl, calls } = recordingFetch([401, 200]);
    const refreshAccessToken = vi.fn(async () => "new-token");

    const response = await withAuthRefresh({ fetchImpl, refreshAccessToken })("/api/app/x", {
      headers: { Authorization: "Bearer old" },
    });

    expect(response.status).toBe(200);
    expect(calls.map((call) => call.authorization)).toEqual([
      "Bearer old",
      "Bearer new-token",
    ]);
  });

  it("재시도도 401 이면 그대로 올린다 — 무한 재시도가 없다", async () => {
    const { fetchImpl, calls } = recordingFetch([401, 401]);
    const refreshAccessToken = vi.fn(async () => "new-token");

    const response = await withAuthRefresh({ fetchImpl, refreshAccessToken })("/api/app/x", {
      headers: { Authorization: "Bearer old" },
    });

    expect(response.status).toBe(401);
    expect(calls).toHaveLength(2);
    expect(refreshAccessToken).toHaveBeenCalledTimes(1);
  });

  it("`Authorization` 없이 보낸 401 은 갱신 대상이 아니다", async () => {
    const { fetchImpl, calls } = recordingFetch([401]);
    const refreshAccessToken = vi.fn(async () => "new-token");

    const response = await withAuthRefresh({ fetchImpl, refreshAccessToken })("/api/public");

    expect(response.status).toBe(401);
    expect(refreshAccessToken).not.toHaveBeenCalled();
    expect(calls).toHaveLength(1);
  });

  it("갱신이 실패하면 401 을 그대로 올린다 — 던지지 않는다", async () => {
    const { fetchImpl, calls } = recordingFetch([401]);
    const refreshAccessToken = vi.fn(async () => null);

    const response = await withAuthRefresh({ fetchImpl, refreshAccessToken })("/api/app/x", {
      headers: { Authorization: "Bearer old" },
    });

    expect(response.status).toBe(401);
    expect(calls).toHaveLength(1);
  });

  it("헤더 외의 `init` 은 그대로 다시 보낸다", async () => {
    const seen: RequestInit[] = [];
    const fetchImpl = vi.fn(async (_input: RequestInfo | URL, init?: RequestInit) => {
      seen.push(init ?? {});
      return respond(seen.length === 1 ? 401 : 200);
    }) as unknown as typeof fetch;

    await withAuthRefresh({ fetchImpl, refreshAccessToken: async () => "new-token" })(
      "/api/app/x",
      { method: "POST", body: '{"a":1}', headers: { Authorization: "Bearer old" } }
    );

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
