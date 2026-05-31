import type { ErrorInfo, ReactNode } from "react";
import { Component } from "react";

type RemoteBoundaryProps = {
  children: ReactNode;
  name: string;
};

type RemoteBoundaryState = {
  hasError: boolean;
};

export class RemoteBoundary extends Component<
  RemoteBoundaryProps,
  RemoteBoundaryState
> {
  public state: RemoteBoundaryState = {
    hasError: false,
  };

  public static getDerivedStateFromError(): RemoteBoundaryState {
    return { hasError: true };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error(`${this.props.name} remote failed to render`, {
      error,
      errorInfo,
    });
  }

  public render() {
    if (this.state.hasError) {
      return (
        <RemoteStatus
          title={`${this.props.name}을 불러오지 못했습니다.`}
          description="잠시 후 다시 시도해주세요."
        />
      );
    }

    return this.props.children;
  }
}

type RemoteStatusProps = {
  title: string;
  description?: string;
};

export const RemoteStatus = ({ title, description }: RemoteStatusProps) => {
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

export const createRemoteLoading = (name: string) => {
  const RemoteLoading = () => <RemoteStatus title={`${name} 로딩 중`} />;

  return RemoteLoading;
};
