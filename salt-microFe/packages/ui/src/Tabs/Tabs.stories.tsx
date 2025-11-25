import type { Meta, StoryObj } from "@storybook/react";
import { Tabs } from "./Tabs.tsx";
import { Card } from "../Card/Card.tsx";
import { FlexBox } from "../FlexBox/FlexBox.tsx";

const meta = {
  title: "Components/Tabs",
  component: Tabs,
  parameters: {
    layout: "padded",
  },
  tags: ["autodocs"],
  argTypes: {
    tabs: {
      description: "탭 데이터 배열",
    },
    defaultActiveTab: {
      control: "text",
      description: "기본 활성 탭 ID (비제어 컴포넌트)",
    },
    activeTab: {
      control: "text",
      description: "활성 탭 ID (제어 컴포넌트)",
    },
    onTabChange: {
      description: "탭 변경 시 호출되는 콜백 함수",
    },
    className: {
      control: "text",
      description: "추가 CSS 클래스명",
    },
  },
} satisfies Meta<typeof Tabs>;

export default meta;
type Story = StoryObj<typeof meta>;

// ===== Basic Examples =====
export const Default: Story = {
  args: {
    tabs: [
      {
        id: "tab1",
        label: "탭 1",
        content: (
          <div>
            <h3>첫 번째 탭 콘텐츠</h3>
            <p>이것은 첫 번째 탭의 내용입니다.</p>
          </div>
        ),
      },
      {
        id: "tab2",
        label: "탭 2",
        content: (
          <div>
            <h3>두 번째 탭 콘텐츠</h3>
            <p>이것은 두 번째 탭의 내용입니다.</p>
          </div>
        ),
      },
      {
        id: "tab3",
        label: "탭 3",
        content: (
          <div>
            <h3>세 번째 탭 콘텐츠</h3>
            <p>이것은 세 번째 탭의 내용입니다.</p>
          </div>
        ),
      },
    ],
  },
};

export const WithDisabledTab: Story = {
  args: {
    tabs: [
      {
        id: "active",
        label: "활성 탭",
        content: <p>이 탭은 정상적으로 클릭 가능합니다.</p>,
      },
      {
        id: "disabled",
        label: "비활성 탭",
        content: <p>이 콘텐츠는 볼 수 없습니다.</p>,
        disabled: true,
      },
      {
        id: "another",
        label: "또 다른 탭",
        content: <p>이 탭도 정상적으로 작동합니다.</p>,
      },
    ],
  },
};

export const WithDefaultActiveTab: Story = {
  args: {
    defaultActiveTab: "tab2",
    tabs: [
      {
        id: "tab1",
        label: "첫 번째",
        content: <p>첫 번째 탭 콘텐츠</p>,
      },
      {
        id: "tab2",
        label: "두 번째 (기본 선택)",
        content: <p>이 탭이 기본으로 선택되어 있습니다.</p>,
      },
      {
        id: "tab3",
        label: "세 번째",
        content: <p>세 번째 탭 콘텐츠</p>,
      },
    ],
  },
};

export const StockMarketTabs: Story = {
  args: {
    tabs: [
      {
        id: "realtime",
        label: "실시간 차트",
        content: (
          <Card padding="lg">
            <FlexBox direction="column" gap="md">
              <h3 style={{ margin: 0 }}>실시간 주식 차트</h3>
              <div
                style={{
                  height: "300px",
                  background: "linear-gradient(to bottom, #f0f9ff, #e0f2fe)",
                  borderRadius: "8px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "#0369a1",
                }}
              >
                차트 영역
              </div>
              <FlexBox gap="sm">
                <button style={{ padding: "8px 16px" }}>1일</button>
                <button style={{ padding: "8px 16px" }}>1주</button>
                <button style={{ padding: "8px 16px" }}>1개월</button>
                <button style={{ padding: "8px 16px" }}>1년</button>
              </FlexBox>
            </FlexBox>
          </Card>
        ),
      },
      {
        id: "watchlist",
        label: "관심 종목",
        content: (
          <Card padding="lg">
            <h3 style={{ margin: "0 0 1rem 0" }}>나의 관심 종목</h3>
            {["삼성전자", "SK하이닉스", "네이버", "카카오"].map((stock) => (
              <FlexBox
                key={stock}
                justify="between"
                style={{
                  padding: "12px",
                  borderBottom: "1px solid #e5e5e5",
                }}
              >
                <span>{stock}</span>
                <span style={{ color: "#059669", fontWeight: "600" }}>
                  +2.34%
                </span>
              </FlexBox>
            ))}
          </Card>
        ),
      },
      {
        id: "news",
        label: "시장 뉴스",
        content: (
          <Card padding="lg">
            <h3 style={{ margin: "0 0 1rem 0" }}>오늘의 주요 뉴스</h3>
            <FlexBox direction="column" gap="md">
              {[
                "코스피 2,500선 돌파, 외국인 매수세 지속",
                "반도체 업황 개선 기대감에 관련주 강세",
                "연준 금리 동결 전망에 증시 안정세",
              ].map((news, i) => (
                <div
                  key={i}
                  style={{
                    padding: "12px",
                    background: "#f9fafb",
                    borderRadius: "4px",
                  }}
                >
                  <p style={{ margin: "0 0 4px 0", fontWeight: "500" }}>
                    {news}
                  </p>
                  <span style={{ fontSize: "12px", color: "#6b7280" }}>
                    2시간 전
                  </span>
                </div>
              ))}
            </FlexBox>
          </Card>
        ),
      },
    ],
  },
};

export const ProductDetailTabs: Story = {
  args: {
    tabs: [
      {
        id: "description",
        label: "상품 설명",
        content: (
          <div style={{ padding: "20px 0" }}>
            <h3>제품 특징</h3>
            <ul>
              <li>프리미엄 소재 사용</li>
              <li>인체공학적 디자인</li>
              <li>5년 품질 보증</li>
              <li>친환경 제조 공정</li>
            </ul>
            <h3>상세 스펙</h3>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <tbody>
                <tr style={{ borderBottom: "1px solid #e5e5e5" }}>
                  <td style={{ padding: "8px", fontWeight: "500" }}>크기</td>
                  <td style={{ padding: "8px" }}>150 x 80 x 45 cm</td>
                </tr>
                <tr style={{ borderBottom: "1px solid #e5e5e5" }}>
                  <td style={{ padding: "8px", fontWeight: "500" }}>무게</td>
                  <td style={{ padding: "8px" }}>12.5 kg</td>
                </tr>
                <tr style={{ borderBottom: "1px solid #e5e5e5" }}>
                  <td style={{ padding: "8px", fontWeight: "500" }}>재질</td>
                  <td style={{ padding: "8px" }}>알루미늄 합금</td>
                </tr>
              </tbody>
            </table>
          </div>
        ),
      },
      {
        id: "reviews",
        label: "리뷰 (128)",
        content: (
          <div style={{ padding: "20px 0" }}>
            <FlexBox justify="between" style={{ marginBottom: "20px" }}>
              <div>
                <h2 style={{ margin: 0 }}>4.8</h2>
                <span style={{ color: "#fbbf24" }}>★★★★★</span>
              </div>
              <button
                style={{
                  padding: "8px 16px",
                  background: "#7949FF",
                  color: "white",
                  border: "none",
                  borderRadius: "4px",
                }}
              >
                리뷰 작성
              </button>
            </FlexBox>
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                style={{
                  padding: "16px 0",
                  borderBottom: "1px solid #e5e5e5",
                }}
              >
                <FlexBox justify="between" style={{ marginBottom: "8px" }}>
                  <strong>사용자{i}</strong>
                  <span style={{ color: "#fbbf24" }}>★★★★★</span>
                </FlexBox>
                <p style={{ margin: 0, color: "#4b5563" }}>
                  정말 만족스러운 제품입니다. 품질이 우수하고 디자인도
                  세련되네요.
                </p>
              </div>
            ))}
          </div>
        ),
      },
      {
        id: "shipping",
        label: "배송/교환",
        content: (
          <div style={{ padding: "20px 0" }}>
            <h3>배송 안내</h3>
            <ul>
              <li>전국 무료 배송</li>
              <li>평균 배송 기간: 2-3일</li>
              <li>제주/도서산간 추가 1-2일 소요</li>
            </ul>
            <h3>교환/반품 안내</h3>
            <ul>
              <li>수령 후 7일 이내 교환/반품 가능</li>
              <li>단순 변심 시 왕복 배송비 고객 부담</li>
              <li>제품 하자 시 무료 교환/반품</li>
            </ul>
          </div>
        ),
      },
      {
        id: "qna",
        label: "Q&A",
        content: (
          <div style={{ padding: "20px 0" }}>
            <FlexBox justify="between" style={{ marginBottom: "20px" }}>
              <h3 style={{ margin: 0 }}>자주 묻는 질문</h3>
              <button
                style={{
                  padding: "8px 16px",
                  background: "#7949FF",
                  color: "white",
                  border: "none",
                  borderRadius: "4px",
                }}
              >
                질문하기
              </button>
            </FlexBox>
            {[
              {
                q: "A/S 기간은 얼마나 되나요?",
                a: "구매일로부터 5년간 무상 A/S가 가능합니다.",
              },
              {
                q: "조립이 필요한가요?",
                a: "간단한 조립이 필요하며, 상세한 설명서가 동봉됩니다.",
              },
              {
                q: "색상 선택이 가능한가요?",
                a: "블랙, 실버, 화이트 3가지 색상 중 선택 가능합니다.",
              },
            ].map((item, i) => (
              <div
                key={i}
                style={{
                  padding: "16px",
                  marginBottom: "12px",
                  background: "#f9fafb",
                  borderRadius: "4px",
                }}
              >
                <p style={{ margin: "0 0 8px 0", fontWeight: "500" }}>
                  Q: {item.q}
                </p>
                <p style={{ margin: 0, color: "#4b5563" }}>A: {item.a}</p>
              </div>
            ))}
          </div>
        ),
      },
    ],
  },
};

export const AccountSettingsTabs: Story = {
  args: {
    defaultActiveTab: "profile",
    tabs: [
      {
        id: "profile",
        label: "프로필",
        content: (
          <Card padding="xl">
            <h3 style={{ marginTop: 0 }}>프로필 설정</h3>
            <FlexBox direction="column" gap="md">
              <div>
                <label
                  style={{ display: "block", marginBottom: "8px" }}
                  htmlFor="name"
                >
                  이름
                </label>
                <input
                  id="name"
                  type="text"
                  defaultValue="홍길동"
                  style={{
                    width: "100%",
                    padding: "8px 12px",
                    border: "1px solid #e5e5e5",
                    borderRadius: "4px",
                  }}
                />
              </div>
              <div>
                <label
                  style={{ display: "block", marginBottom: "8px" }}
                  htmlFor="email"
                >
                  이메일
                </label>
                <input
                  id="email"
                  type="email"
                  defaultValue="hong@example.com"
                  style={{
                    width: "100%",
                    padding: "8px 12px",
                    border: "1px solid #e5e5e5",
                    borderRadius: "4px",
                  }}
                />
              </div>
              <button
                style={{
                  padding: "10px 20px",
                  background: "#7949FF",
                  color: "white",
                  border: "none",
                  borderRadius: "4px",
                  alignSelf: "flex-start",
                }}
              >
                저장
              </button>
            </FlexBox>
          </Card>
        ),
      },
      {
        id: "notifications",
        label: "알림",
        content: (
          <Card padding="xl">
            <h3 style={{ marginTop: 0 }}>알림 설정</h3>
            <FlexBox direction="column" gap="lg">
              {[
                { label: "이메일 알림", checked: true },
                { label: "SMS 알림", checked: false },
                { label: "푸시 알림", checked: true },
                { label: "마케팅 수신 동의", checked: false },
              ].map((item, i) => (
                <label
                  key={i}
                  style={{ display: "flex", alignItems: "center", gap: "8px" }}
                >
                  <input type="checkbox" defaultChecked={item.checked} />
                  <span>{item.label}</span>
                </label>
              ))}
            </FlexBox>
          </Card>
        ),
      },
      {
        id: "security",
        label: "보안",
        content: (
          <Card padding="xl">
            <h3 style={{ marginTop: 0 }}>보안 설정</h3>
            <FlexBox direction="column" gap="lg">
              <div>
                <h4>비밀번호 변경</h4>
                <button
                  style={{
                    padding: "8px 16px",
                    background: "white",
                    border: "1px solid #e5e5e5",
                    borderRadius: "4px",
                  }}
                >
                  비밀번호 변경하기
                </button>
              </div>
              <div>
                <h4>2단계 인증</h4>
                <FlexBox gap="md" align="center">
                  <span
                    style={{
                      padding: "4px 8px",
                      background: "#10b981",
                      color: "white",
                      borderRadius: "4px",
                      fontSize: "12px",
                    }}
                  >
                    활성화됨
                  </span>
                  <button
                    style={{
                      padding: "8px 16px",
                      background: "white",
                      border: "1px solid #e5e5e5",
                      borderRadius: "4px",
                    }}
                  >
                    설정 변경
                  </button>
                </FlexBox>
              </div>
            </FlexBox>
          </Card>
        ),
      },
      {
        id: "privacy",
        label: "개인정보",
        content: (
          <Card padding="xl">
            <h3 style={{ marginTop: 0 }}>개인정보 관리</h3>
            <FlexBox direction="column" gap="lg">
              <div
                style={{
                  padding: "16px",
                  background: "#fef3c7",
                  borderRadius: "4px",
                }}
              >
                <strong>주의:</strong> 계정 삭제 시 모든 데이터가 영구적으로
                삭제됩니다.
              </div>
              <button
                style={{
                  padding: "10px 20px",
                  background: "#ef4444",
                  color: "white",
                  border: "none",
                  borderRadius: "4px",
                  alignSelf: "flex-start",
                }}
              >
                계정 삭제
              </button>
            </FlexBox>
          </Card>
        ),
      },
    ],
  },
};

export const ManyTabs: Story = {
  args: {
    tabs: Array.from({ length: 10 }, (_, i) => ({
      id: `tab${i + 1}`,
      label: `탭 ${i + 1}`,
      content: (
        <Card padding="lg">
          <h3>탭 {i + 1}의 콘텐츠</h3>
          <p>
            많은 탭이 있을 때 가로 스크롤이 가능합니다. 키보드 네비게이션도
            지원됩니다.
          </p>
        </Card>
      ),
    })),
  },
};

export const EmptyTabs: Story = {
  args: {
    tabs: [],
  },
};
