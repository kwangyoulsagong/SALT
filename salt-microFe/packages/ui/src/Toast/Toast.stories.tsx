import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { Toast } from "./Toast";
import { ToastProvider } from "./ToastProvider";
import { useToast } from "./useToast";
import { Button } from "../Button/Button";

const TONES = ["neutral", "success", "error", "warning", "info"] as const;

const meta = {
  title: "Components/Toast",
  component: Toast,
  parameters: {
    layout: "centered",
  },
  tags: ["autodocs"],
  argTypes: {
    tone: {
      control: "select",
      options: TONES,
      description: "심각도. error는 role=\"alert\"로 즉시 읽힌다",
    },
    children: {
      control: "text",
      description: "토스트 문구",
    },
  },
} satisfies Meta<typeof Toast>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    children: "거래 기록을 저장했습니다",
  },
};

export const AllTones: Story = {
  args: { children: "" },
  render: () => (
    <div style={{ display: "grid", gap: 12, width: 360 }}>
      {TONES.map((tone) => (
        <Toast key={tone} tone={tone}>
          {tone} 토스트 문구
        </Toast>
      ))}
    </div>
  ),
};

export const WithAction: Story = {
  args: {
    children: "알림을 삭제했습니다",
    action: (
      <Button size="xs" variant="ghost">
        되돌리기
      </Button>
    ),
  },
};

/** 실제 사용 방식 — `ToastProvider`로 감싸고 `useToast`로 띄운다. */
export const WithProvider: Story = {
  args: { children: "" },
  render: function WithProviderStory() {
    const Trigger = () => {
      const { toast } = useToast();

      return (
        <div style={{ display: "grid", gap: 8, width: 240 }}>
          <Button
            size="sm"
            onClick={() => toast({ message: "저장했습니다", tone: "success" })}
          >
            성공 토스트
          </Button>
          <Button
            size="sm"
            variant="danger"
            onClick={() =>
              toast({ message: "저장하지 못했습니다", tone: "error" })
            }
          >
            에러 토스트
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={() =>
              toast({ message: "닫기 전까지 유지됩니다", duration: 0 })
            }
          >
            자동으로 안 닫히는 토스트
          </Button>
        </div>
      );
    };

    return (
      <ToastProvider>
        <Trigger />
      </ToastProvider>
    );
  },
};

/** max를 넘기면 오래된 토스트부터 사라진다. */
export const MaxStack: Story = {
  args: { children: "" },
  render: function MaxStackStory() {
    const Trigger = () => {
      const { toast } = useToast();
      let count = 0;

      return (
        <Button
          size="sm"
          onClick={() => {
            count += 1;
            toast({ message: `토스트 ${count}`, duration: 0 });
          }}
        >
          토스트 쌓기 (최대 2개)
        </Button>
      );
    };

    return (
      <ToastProvider max={2}>
        <Trigger />
      </ToastProvider>
    );
  },
};

export const LongMessage: Story = {
  args: {
    tone: "warning",
    children:
      "네트워크 상태가 불안정해 일부 시세가 지연되고 있습니다. 잠시 후 다시 확인해 주세요.",
  },
};
