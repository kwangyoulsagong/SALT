import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { AppNavigation, AppNavigationHeaderNav } from "./AppNavigation";
import type { AppNavigationItem } from "./AppNavigation";
import { AppNavigationIcon } from "./AppNavigationIcon";
import { AppNavigationSearch } from "./AppNavigationSearch";
import { Logo } from "../Logo/Logo";

const items: AppNavigationItem[] = [
  { id: "home", label: "홈", href: "#home", icon: <AppNavigationIcon name="home" />, active: true },
  { id: "savings", label: "저축", href: "#savings", icon: <AppNavigationIcon name="coin" /> },
  { id: "household", label: "가계부", href: "#household", icon: <AppNavigationIcon name="wallet" />, disabledReason: "준비 중" },
  { id: "invest", label: "투자", href: "#invest", icon: <AppNavigationIcon name="chart" /> },
];

const Body = () => (
  <div style={{ padding: 16, minHeight: 600, background: "#F2F4F6" }}>
    본문 — 1024 이상은 머리 링크 줄 · 검색칸, 768~1023 은 하단 탭이 보인다(뷰포트 크기를 바꿔 본다)
  </div>
);

const meta = {
  title: "Components/AppNavigation",
  component: AppNavigation,
  parameters: { layout: "fullscreen" },
  tags: ["autodocs"],
  argTypes: {
    label: { control: "text", description: "스크린 리더가 읽을 내비게이션 이름" },
  },
  args: {
    label: "주요 메뉴",
    items,
    children: <Body />,
    brand: <Logo decorative />,
    headerEnd: <span style={{ fontSize: 14 }}>계정</span>,
    headerNav: (
      <AppNavigationHeaderNav
        label="투자 메뉴"
        items={["코인", "주식", "포트폴리오", "리포트", "코치 설정"].map((menu, index) => ({
          id: menu,
          label: menu,
          href: "#",
          icon: null,
          active: index === 0,
        }))}
      />
    ),
    headerSearch: <AppNavigationSearch label="종목 검색" hint=" 를 눌러 검색해요" shortcut={false} />,
  },
} satisfies Meta<typeof AppNavigation>;

export default meta;
type Story = StoryObj<typeof meta>;

/** 데스크톱(1024 이상) — 왼쪽 레일(도메인) · 머리 = zone 메뉴(글자 · 선택은 진하기만) + 검색칸(투자 zone 판, `FE-REQ-069`) */
export const Default: Story = {};

/** 태블릿 폭(768~1023) — 하단 탭(도메인) · 머리 메뉴는 그대로 */
export const Tablet: Story = {
  parameters: { viewport: { defaultViewport: "tablet" } },
};

/** 지금 탭이 없는 화면(설정 등) — 레일에 지금 탭 없음 */
export const NoActiveTab: Story = {
  args: { items: items.map((item) => ({ ...item, active: false })) },
};

/** 내비 없는 화면(로그인 · 온보딩) — 틀만 */
export const Bare: Story = {
  args: { bare: true },
};

/** 긴 이름 — 레일 · 하단 탭은 칸 폭에서 말줄임 */
export const LongLabel: Story = {
  args: {
    items: items.map((item) => (item.id === "invest" ? { ...item, label: "투자 포트폴리오" } : item)),
  },
};

/** 아이콘 한 벌 — 면을 채운 단색 글리프(지금 탭 = 진한 색, 나머지 = 옅은 회색) */
export const Icons: Story = {
  render: () => (
    <div style={{ display: "flex", gap: 24, padding: 24 }}>
      {(["home", "coin", "wallet", "chart"] as const).map((name) => (
        <AppNavigationIcon key={name} name={name} size={32} />
      ))}
    </div>
  ),
};

/** 검색칸 둘 — 단추(모달을 여는 zone) · 링크(검색 화면이 다른 zone). `/` 키는 Storybook 에서 끈다(문서 단축키가 겹친다) */
export const SearchBox: Story = {
  render: () => (
    <div style={{ display: "flex", gap: 16, padding: 24 }}>
      <AppNavigationSearch label="종목 검색" hint=" 를 눌러 검색해요" shortcut={false} onPress={() => undefined} />
      <AppNavigationSearch label="종목 검색" hint=" 를 눌러 검색해요" shortcut={false} href="#search" />
    </div>
  ),
};
