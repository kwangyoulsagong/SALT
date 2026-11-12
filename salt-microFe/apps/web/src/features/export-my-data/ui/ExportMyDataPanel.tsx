"use client";

import { Button } from "@repo/ui/button";
import { StatusLine } from "@repo/ui/statusLine";

import { useHasSession } from "@repo/web-shared/api";
import { panel, panelHead, panelTitle } from "@repo/web-shared/ui/surface.css";

import { useExportMyData } from "../api";
import { EXPORT_MY_DATA_MESSAGES as MSG } from "../model";
import { actions, description } from "./ExportMyDataPanel.css";

/** 내 데이터 내려받기(`FE-REQ-055` FR-5 · `BFF-REQ-046` FR-7). 로그인 전이면 패널째 없다 */
export const ExportMyDataPanel = () => {
  const signedIn = useHasSession();
  const exporting = useExportMyData();

  if (signedIn === false) return null;

  return (
    <section className={panel}>
      <div className={panelHead}>
        <h2 className={panelTitle}>{MSG.heading}</h2>
      </div>
      <p className={description}>{MSG.description}</p>
      <div className={actions}>
        <Button variant="primary" onClick={() => exporting.mutate()} loading={exporting.isPending} disabled={signedIn !== true}>
          {exporting.isPending ? MSG.pending : MSG.action}
        </Button>
      </div>
      {exporting.isSuccess && <StatusLine kind="success">{MSG.done}</StatusLine>}
      {exporting.isError && <StatusLine kind="error">{MSG.failed}</StatusLine>}
    </section>
  );
};
