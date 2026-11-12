"use client";

import { useMutation } from "@tanstack/react-query";

import { apiFetch, readApiError, type ApiError } from "@repo/web-shared/api";
import { INVESTMENTS_BASE_URL } from "@repo/web-shared/config";

/** `GET /api/app/me/export` — BFF 가 서비스마다 읽어 zip 하나로 바로 내려 준다(저장 0, `BFF-REQ-046` FR-7) */
export const MY_DATA_EXPORT_ENDPOINT = "/api/app/me/export";

const FALLBACK_NAME = "salt-my-data.zip";

const fileNameOf = (disposition: string | null): string => disposition?.match(/filename="([^"]+)"/)?.[1] ?? FALLBACK_NAME;

/** 받은 파일을 이 기기에 저장 — 눌렀을 때만(렌더 중 아님) */
const save = (blob: Blob, name: string) => {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = name;
  link.click();
  URL.revokeObjectURL(url);
};

const exportMyData = async (): Promise<void> => {
  const response = await apiFetch(`${INVESTMENTS_BASE_URL}${MY_DATA_EXPORT_ENDPOINT}`);
  if (!response.ok) throw await readApiError(response, "export my data");
  save(await response.blob(), fileNameOf(response.headers.get("Content-Disposition")));
};

/** 내려받기 — 재시도 0(서버가 다 읽거나 실패다. 일부만 담긴 파일은 없다) */
export const useExportMyData = () => useMutation<void, ApiError>({ mutationFn: exportMyData, retry: 0 });
