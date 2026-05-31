import type { Meta, StoryObj } from "@storybook/react";
import { Root } from "./Root";

const meta = {
  title: "Layout/Root",
  component: Root,
  parameters: {
    layout: "fullscreen",
  },
  tags: ["autodocs"],
  argTypes: {
    background: {
      control: "select",
      options: ["transparent", "white", "gray", "brand", "dark", "gradient"],
      description: "배경색",
    },
    fullHeight: {
      control: "boolean",
      description: "전체 높이 사용",
    },
    width: {
      control: "select",
      options: ["xs", "sm", "md", "lg", "xl", "2xl", "3xl", "4xl", "full"],
      description: "너비",
    },
    children: {
      control: "text",
      description: "내부 콘텐츠",
    },
  },
  args: {
    children: "Root Component Example",
    background: "transparent",
    fullHeight: false,
    width: "full",
  },
} satisfies Meta<typeof Root>;

export default meta;

type Story = StoryObj<typeof meta>;

// 기본 스토리
export const Default: Story = {};

// 다양한 배경 스토리
export const Backgrounds: Story = {
  args: {
    children: "Background Variant Example",
    width: "full",
  },
};

// Full Height 예시
export const FullHeight: Story = {
  args: {
    fullHeight: true,
    background: "gray",
    children: (
      <div
        style={{
          height: "100%",
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
        }}
      >
        Full Height Example
      </div>
    ),
  },
};
