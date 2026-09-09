import { useState } from "react";
import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { Dialog } from "./Dialog";
import { DialogProvider } from "./DialogProvider";
import { useDialog } from "./useDialog";
import { Button } from "../Button/Button";

const meta = {
  title: "Components/Dialog",
  component: Dialog,
  parameters: { layout: "fullscreen" },
  tags: ["autodocs"],
  argTypes: {
    tone: {
      control: "inline-radio",
      options: ["default", "danger"],
      description: "확인 버튼 색. danger는 되돌릴 수 없는 행동에 쓴다",
    },
    confirmText: { control: "text", description: "확인 버튼 문구" },
    cancelText: {
      control: "text",
      description: "넘기면 취소 버튼이 함께 나온다(confirm). 없으면 알림(alert)",
    },
  },
} satisfies Meta<typeof Dialog>;

export default meta;
type Story = StoryObj<typeof meta>;

/** 취소 없이 확인만 받는다. */
export const Alert: Story = {
  args: { open: false, title: "", onConfirm: () => {} },
  render: function AlertStory() {
    const [open, setOpen] = useState(false);
    return (
      <div style={{ padding: 24 }}>
        <Button size="sm" onClick={() => setOpen(true)}>
          알림 열기
        </Button>
        <Dialog
          open={open}
          title="주문이 접수되었습니다"
          description="체결되면 알림으로 알려드립니다."
          onConfirm={() => setOpen(false)}
        />
      </div>
    );
  },
};

export const Confirm: Story = {
  args: { open: false, title: "", onConfirm: () => {} },
  render: function ConfirmStory() {
    const [open, setOpen] = useState(false);
    const [result, setResult] = useState("—");
    return (
      <div style={{ padding: 24, display: "grid", gap: 8 }}>
        <Button size="sm" onClick={() => setOpen(true)}>
          확인창 열기
        </Button>
        <span style={{ fontSize: 13, color: "#8B95A1" }}>선택: {result}</span>
        <Dialog
          open={open}
          title="12주를 시장가로 매수할까요?"
          description="예상 금액 890,400원입니다."
          cancelText="취소"
          confirmText="매수"
          onConfirm={() => {
            setResult("매수");
            setOpen(false);
          }}
          onCancel={() => {
            setResult("취소");
            setOpen(false);
          }}
        />
      </div>
    );
  },
};

export const Danger: Story = {
  args: { open: false, title: "", onConfirm: () => {} },
  render: function DangerStory() {
    const [open, setOpen] = useState(false);
    return (
      <div style={{ padding: 24 }}>
        <Button size="sm" variant="danger" onClick={() => setOpen(true)}>
          삭제
        </Button>
        <Dialog
          open={open}
          tone="danger"
          title="거래 기록을 삭제할까요?"
          description="삭제하면 되돌릴 수 없습니다."
          cancelText="취소"
          confirmText="삭제"
          onConfirm={() => setOpen(false)}
          onCancel={() => setOpen(false)}
        />
      </div>
    );
  },
};

/** 실제 사용 방식 — Promise로 결과를 받는다. */
export const WithProvider: Story = {
  args: { open: false, title: "", onConfirm: () => {} },
  render: function WithProviderStory() {
    const Trigger = () => {
      const { alert, confirm } = useDialog();
      const [log, setLog] = useState<string[]>([]);

      return (
        <div style={{ display: "grid", gap: 8, width: 260 }}>
          <Button
            size="sm"
            onClick={async () => {
              const yes = await confirm({
                title: "정말 매도할까요?",
                description: "손실이 확정됩니다.",
                confirmText: "매도",
                tone: "danger",
              });
              setLog((prev) => [...prev, yes ? "확인" : "취소"]);
            }}
          >
            confirm 호출
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={async () => {
              await alert({ title: "저장했습니다" });
              setLog((prev) => [...prev, "알림 닫힘"]);
            }}
          >
            alert 호출
          </Button>
          <span style={{ fontSize: 13, color: "#8B95A1" }}>
            {log.join(" · ") || "아직 없음"}
          </span>
        </div>
      );
    };

    return (
      <div style={{ padding: 24 }}>
        <DialogProvider>
          <Trigger />
        </DialogProvider>
      </div>
    );
  },
};

export const LongDescription: Story = {
  args: { open: false, title: "", onConfirm: () => {} },
  render: function LongStory() {
    const [open, setOpen] = useState(false);
    return (
      <div style={{ padding: 24 }}>
        <Button size="sm" onClick={() => setOpen(true)}>
          열기
        </Button>
        <Dialog
          open={open}
          title="주문 전 확인해 주세요"
          description="이 종목은 최근 30일 변동성이 큰 편입니다. 표시된 예상 금액은 현재 호가 기준이며 실제 체결 금액과 다를 수 있습니다. 투자 판단과 손실 책임은 본인에게 있습니다."
          cancelText="취소"
          onConfirm={() => setOpen(false)}
          onCancel={() => setOpen(false)}
        />
      </div>
    );
  },
};
