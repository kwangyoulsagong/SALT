"use client";

// 클라이언트 잎: 상태·effect·memo 를 갖는다. barrel 로 노출되므로 경계를 스스로 갖는다.
import type { ErrorInfo, ReactNode } from "react";
import { Component } from "react";

import { BOUNDARY_MESSAGES } from "@/shared/i18n";

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
};

export const SectionStatus = ({ title, description }: SectionStatusProps) => {
  return (
    <div
      role="status"
      style={{
        border: "1px solid #e5e7eb",
        borderRadius: 8,
        color: "#111827",
        padding: 16,
        width: "100%",
      }}
    >
      <strong>{title}</strong>
      {description ? <p style={{ margin: "8px 0 0" }}>{description}</p> : null}
    </div>
  );
};

export const createSectionLoading = (name: string) => {
  const SectionLoading = () => <SectionStatus title={BOUNDARY_MESSAGES.loading(name)} />;

  return SectionLoading;
};
