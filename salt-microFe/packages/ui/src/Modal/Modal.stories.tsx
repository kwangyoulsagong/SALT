import { useState } from "react";
import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { Modal } from "./Modal";
import { Button } from "../Button/Button";
import { KeyValueList } from "../KeyValueList/KeyValueList";

const meta = {
  title: "Components/Modal",
  component: Modal,
  parameters: { layout: "fullscreen" },
  tags: ["autodocs"],
  argTypes: {
    size: { control: "select", options: ["sm", "md", "lg"], description: "가로 최대 폭" },
    hideCloseButton: { control: "boolean", description: "닫기 버튼 숨김" },
    disableBackdropClose: {
      control: "boolean",
      description: "배경을 눌러도 닫히지 않게 한다",
    },
  },
} satisfies Meta<typeof Modal>;

export default meta;
type Story = StoryObj<typeof meta>;

/** 열면 포커스가 갇히고 ESC·배경 클릭으로 닫힌다. 닫으면 포커스가 버튼으로 돌아온다. */
export const Default: Story = {
  args: { open: false, onClose: () => {}, children: null },
  render: function DefaultStory() {
    const [open, setOpen] = useState(false);
    return (
      <div style={{ padding: 24 }}>
        <Button size="sm" onClick={() => setOpen(true)}>
          모달 열기
        </Button>
        <Modal open={open} onClose={() => setOpen(false)} title="종목 정보">
          <KeyValueList
            items={[
              { label: "종목", value: "삼성전자" },
              { label: "코드", value: "005930" },
              { label: "시장", value: "KOSPI" },
            ]}
          />
        </Modal>
      </div>
    );
  },
};

export const WithFooter: Story = {
  args: { open: false, onClose: () => {}, children: null },
  render: function WithFooterStory() {
    const [open, setOpen] = useState(false);
    return (
      <div style={{ padding: 24 }}>
        <Button size="sm" onClick={() => setOpen(true)}>
          모달 열기
        </Button>
        <Modal
          open={open}
          onClose={() => setOpen(false)}
          title="알림 만들기"
          footer={
            <>
              <Button variant="ghost" size="sm" fullWidth onClick={() => setOpen(false)}>
                취소
              </Button>
              <Button size="sm" fullWidth onClick={() => setOpen(false)}>
                저장
              </Button>
            </>
          }
        >
          목표가에 닿으면 알려드립니다.
        </Modal>
      </div>
    );
  },
};

export const AllSizes: Story = {
  args: { open: false, onClose: () => {}, children: null },
  render: function AllSizesStory() {
    const [size, setSize] = useState<"sm" | "md" | "lg" | null>(null);
    return (
      <div style={{ padding: 24, display: "flex", gap: 8 }}>
        {(["sm", "md", "lg"] as const).map((item) => (
          <Button key={item} size="sm" variant="ghost" onClick={() => setSize(item)}>
            {item}
          </Button>
        ))}
        <Modal
          open={size !== null}
          onClose={() => setSize(null)}
          title={`${size} 모달`}
          size={size ?? "md"}
        >
          가로 최대 폭만 달라진다.
        </Modal>
      </div>
    );
  },
};

/** 확인을 강제해야 하는 화면 — 닫기 버튼과 배경 클릭을 둘 다 막는다. */
export const Blocking: Story = {
  args: { open: false, onClose: () => {}, children: null },
  render: function BlockingStory() {
    const [open, setOpen] = useState(false);
    return (
      <div style={{ padding: 24 }}>
        <Button size="sm" onClick={() => setOpen(true)}>
          모달 열기
        </Button>
        <Modal
          open={open}
          onClose={() => setOpen(false)}
          title="약관 동의가 필요합니다"
          hideCloseButton
          disableBackdropClose
          footer={
            <Button size="sm" fullWidth onClick={() => setOpen(false)}>
              동의하고 계속
            </Button>
          }
        >
          동의하지 않으면 다음으로 넘어갈 수 없습니다.
        </Modal>
      </div>
    );
  },
};

/** 내용이 길면 모달 안쪽만 스크롤된다. */
export const LongContent: Story = {
  args: { open: false, onClose: () => {}, children: null },
  render: function LongContentStory() {
    const [open, setOpen] = useState(false);
    return (
      <div style={{ padding: 24, height: "130vh" }}>
        <Button size="sm" onClick={() => setOpen(true)}>
          모달 열기
        </Button>
        <Modal open={open} onClose={() => setOpen(false)} title="세금 파라미터">
          <KeyValueList
            items={Array.from({ length: 24 }, (_, index) => ({
              label: `항목 ${index + 1}`,
              value: `${(index + 1) * 1000}`,
            }))}
          />
        </Modal>
      </div>
    );
  },
};
