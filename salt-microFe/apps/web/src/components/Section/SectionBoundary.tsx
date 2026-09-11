import type { ErrorInfo, ReactNode } from "react";
import { Component } from "react";

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
          title={`${this.props.name}을 불러오지 못했습니다.`}
          description="잠시 후 다시 시도해주세요."
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
  const SectionLoading = () => <SectionStatus title={`${name} 로딩 중`} />;

  return SectionLoading;
};
