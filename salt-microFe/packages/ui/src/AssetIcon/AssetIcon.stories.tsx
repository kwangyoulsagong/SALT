import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { AssetIcon } from "./AssetIcon";

const meta = {
  title: "Components/AssetIcon",
  component: AssetIcon,
  parameters: {
    layout: "centered",
  },
  tags: ["autodocs"],
  argTypes: {
    symbol: {
      control: "text",
      description: "종목 코드나 티커. 이니셜과 배경색의 근거",
    },
    src: {
      control: "text",
      description: "로고 URL. 없으면 이니셜로 폴백한다",
    },
    size: {
      control: "select",
      options: ["sm", "md", "lg", "xl"],
      description: "아이콘 크기",
    },
    name: {
      control: "text",
      description: "스크린 리더가 읽을 이름",
    },
  },
} satisfies Meta<typeof AssetIcon>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    symbol: "AAPL",
    name: "애플",
  },
};

/** 같은 심볼이면 항상 같은 색이 나온다. */
export const InitialFallback: Story = {
  args: { symbol: "" },
  render: () => (
    <div style={{ display: "flex", gap: 8 }}>
      {["AAPL", "TSLA", "삼성전자", "005930", "NVDA", "카카오"].map(
        (symbol) => (
          <AssetIcon key={symbol} symbol={symbol} size="lg" />
        )
      )}
    </div>
  ),
};

export const AllSizes: Story = {
  args: { symbol: "" },
  render: () => (
    <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
      {(["sm", "md", "lg", "xl"] as const).map((size) => (
        <AssetIcon key={size} symbol="AAPL" name="애플" size={size} />
      ))}
    </div>
  ),
};

export const WithImage: Story = {
  args: {
    symbol: "SALT",
    name: "샘플 로고",
    size: "xl",
    src:
      "data:image/svg+xml;utf8," +
      encodeURIComponent(
        '<svg xmlns="http://www.w3.org/2000/svg" width="48" height="48">' +
          '<rect width="48" height="48" fill="#7949FF"/>' +
          '<circle cx="24" cy="24" r="10" fill="#FFFFFF"/></svg>'
      ),
  },
};

/** 빈 문자열이 들어와도 깨지지 않는다. */
export const EmptySymbol: Story = {
  args: {
    symbol: "",
    name: "알 수 없는 종목",
    size: "lg",
  },
};
