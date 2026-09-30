"use client";

// 클라이언트 잎: 상태·effect·memo 를 갖는다. barrel 로 노출되므로 경계를 스스로 갖는다.
import type { ErrorInfo, ReactNode } from "react";
import { Component } from "react";
import { StatusGraphic } from "@repo/ui/statusGraphic";

import { BOUNDARY_MESSAGES } from "@/shared/i18n";

import { statusBox, statusDescription, statusTitle } from "./SectionBoundary.css";

type SectionBoundaryProps = {
  children: ReactNode;
  name: string;
};

type SectionBoundaryState = {
  hasError: boolean;
};

export class SectionBoundary extends Component<
  SectionBoundaryProps,
  SectionBoundaryState
> {
  public state: SectionBoundaryState = {
    hasError: false,
  };

  public static getDerivedStateFromError(): SectionBoundaryState {
    return { hasError: true };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error(`${this.props.name} section failed to render`, {
      error,
      errorInfo,
    });
  }

  public render() {
    if (this.state.hasError) {
      return (
        <SectionStatus
          kind="error"
          title={BOUNDARY_MESSAGES.failedTitle(this.props.name)}
          description={BOUNDARY_MESSAGES.failedDescription}
        />
      );
    }

    return this.props.children;
  }
}

type SectionStatusProps = {
  title: string;
  description?: string;
  /** 실패면 느낌표가 한 번 흔들리고, 불러오는 중이면 점이 뛴다 (FE-REQ-044 P-14) */
  kind?: "error" | "progress";
};

export const SectionStatus = ({ title, description, kind = "progress" }: SectionStatusProps) => {
  return (
    <div role="status" className={statusBox}>
      <StatusGraphic kind={kind} size="sm" />
      <div>
        <strong className={statusTitle}>{title}</strong>
        {description ? <p className={statusDescription}>{description}</p> : null}
      </div>
    </div>
  );
};

export const createSectionLoading = (name: string) => {
  const SectionLoading = () => <SectionStatus title={BOUNDARY_MESSAGES.loading(name)} />;

  return SectionLoading;
};
