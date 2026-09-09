import { useState } from "react";
import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { BottomSheet } from "./BottomSheet";
import { Button } from "../Button/Button";
import { KeyValueList } from "../KeyValueList/KeyValueList";

const meta = {
  title: "Components/BottomSheet",
  component: BottomSheet,
  parameters: {
    layout: "fullscreen",
  },
  tags: ["autodocs"],
  argTypes: {
    open: {
      control: "boolean",
      description: "열림 여부",
    },
    title: {
      control: "text",
      description: "시트 제목",
    },
    grabber: {
      control: "boolean",
      description: "위쪽 손잡이 표시",
    },
    label: {
      control: "text",
      description: "title이 없을 때 스크린 리더가 읽을 이름",
    },
  },
} satisfies Meta<typeof BottomSheet>;

export default meta;
type Story = StoryObj<typeof meta>;

/** 열면 포커스가 시트로 들어가고, ESC나 배경 클릭으로 닫힌다. 닫으면 포커스가 버튼으로 돌아온다. */
export const Default: Story = {
  args: {
    open: false,
    onClose: () => {},
    title: "주문 전 확인",
    children: null,
  },
  render: function DefaultStory() {
    const [open, setOpen] = useState(false);

    return (
      <div style={{ padding: 24 }}>
        <Button size="sm" onClick={() => setOpen(true)}>
          시트 열기
        </Button>

        <BottomSheet
          open={open}
          onClose={() => setOpen(false)}
          title="주문 전 확인"
        >
          <KeyValueList
            items={[
              { label: "종목", value: "삼성전자" },
              { label: "수량", value: "12주" },
              { label: "단가", value: "74,200원" },
              { label: "예상 금액", value: "890,400원" },
            ]}
          />
          <div style={{ display: "flex", gap: 8, marginTop: 24 }}>
            <Button size="sm" variant="ghost" fullWidth onClick={() => setOpen(false)}>
              취소
            </Button>
            <Button size="sm" fullWidth onClick={() => setOpen(false)}>
              확인
            </Button>
          </div>
        </BottomSheet>
      </div>
    );
  },
};

/** Tab이 시트 밖으로 나가지 않는지 확인한다. 뒤쪽 버튼에는 포커스가 가지 않아야 한다. */
export const FocusTrap: Story = {
  args: { open: false, onClose: () => {}, children: null },
  render: function FocusTrapStory() {
    const [open, setOpen] = useState(false);

    return (
      <div style={{ padding: 24, display: "grid", gap: 12 }}>
        <Button size="sm" onClick={() => setOpen(true)}>
          시트 열기
        </Button>
        <Button size="sm" variant="ghost">
          배경 버튼 1
        </Button>
        <Button size="sm" variant="ghost">
          배경 버튼 2
        </Button>

        <BottomSheet
          open={open}
          onClose={() => setOpen(false)}
          title="포커스 가두기"
        >
          <div style={{ display: "grid", gap: 12 }}>
            <Button size="sm" variant="ghost">
              시트 버튼 1
            </Button>
            <Button size="sm" variant="ghost">
              시트 버튼 2
            </Button>
            <Button size="sm" onClick={() => setOpen(false)}>
              닫기
            </Button>
          </div>
        </BottomSheet>
      </div>
    );
  },
};

export const WithoutTitle: Story = {
  args: { open: false, onClose: () => {}, children: null },
  render: function WithoutTitleStory() {
    const [open, setOpen] = useState(false);

    return (
      <div style={{ padding: 24 }}>
        <Button size="sm" onClick={() => setOpen(true)}>
          시트 열기
        </Button>

        <BottomSheet
          open={open}
          onClose={() => setOpen(false)}
          label="빠른 작업"
        >
          <div style={{ display: "grid", gap: 12 }}>
            <Button size="sm" variant="ghost" fullWidth>
              관심 종목에 추가
            </Button>
            <Button size="sm" variant="ghost" fullWidth>
              알림 만들기
            </Button>
            <Button size="sm" fullWidth onClick={() => setOpen(false)}>
              닫기
            </Button>
          </div>
        </BottomSheet>
      </div>
    );
  },
};

/** 내용이 길면 시트 안쪽만 스크롤되고 배경은 잠긴다. */
export const LongContent: Story = {
  args: { open: false, onClose: () => {}, children: null },
  render: function LongContentStory() {
    const [open, setOpen] = useState(false);

    return (
      <div style={{ padding: 24, height: "150vh" }}>
        <Button size="sm" onClick={() => setOpen(true)}>
          시트 열기
        </Button>

        <BottomSheet
          open={open}
          onClose={() => setOpen(false)}
          title="세금 파라미터"
        >
          <KeyValueList
            items={Array.from({ length: 20 }, (_, index) => ({
              label: `항목 ${index + 1}`,
              value: `${(index + 1) * 1000}`,
            }))}
          />
        </BottomSheet>
      </div>
    );
  },
};

export const WithoutGrabber: Story = {
  args: { open: false, onClose: () => {}, children: null },
  render: function WithoutGrabberStory() {
    const [open, setOpen] = useState(false);

    return (
      <div style={{ padding: 24 }}>
        <Button size="sm" onClick={() => setOpen(true)}>
          시트 열기
        </Button>

        <BottomSheet
          open={open}
          onClose={() => setOpen(false)}
          title="손잡이 없음"
          grabber={false}
        >
          <Button size="sm" fullWidth onClick={() => setOpen(false)}>
            닫기
          </Button>
        </BottomSheet>
      </div>
    );
  },
};
