import type { Meta, StoryObj } from "@storybook/react";
import { useState } from "react";
import {
  Table,
  TableContainer,
  TableHeader,
  TableHeaderCell,
  TableBody,
  TableRow,
  TableCell,
  EmptyState,
} from "./Table.tsx";

const meta = {
  title: "Components/Table",
  component: Table,
  parameters: {
    layout: "padded",
  },
  tags: ["autodocs"],
  argTypes: {
    size: {
      control: "select",
      options: ["sm", "md", "lg"],
      description: "테이블 크기",
    },
    layout: {
      control: "select",
      options: ["auto", "fixed"],
      description: "테이블 레이아웃",
    },
    striped: {
      control: "boolean",
      description: "줄무늬 스타일",
    },
    hoverable: {
      control: "boolean",
      description: "호버 효과",
    },
  },
} satisfies Meta<typeof Table>;

export default meta;
type Story = StoryObj<typeof meta>;

// ===== Basic Examples =====
export const Default: Story = {
  args: {
    children: null,
  },
  render: () => (
    <TableContainer>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHeaderCell>이름</TableHeaderCell>
            <TableHeaderCell>이메일</TableHeaderCell>
            <TableHeaderCell align="center">역할</TableHeaderCell>
            <TableHeaderCell align="right">가입일</TableHeaderCell>
          </TableRow>
        </TableHeader>
        <TableBody>
          <TableRow bordered>
            <TableCell>홍길동</TableCell>
            <TableCell>hong@example.com</TableCell>
            <TableCell align="center">관리자</TableCell>
            <TableCell align="right">2024.01.15</TableCell>
          </TableRow>
          <TableRow bordered>
            <TableCell>김철수</TableCell>
            <TableCell>kim@example.com</TableCell>
            <TableCell align="center">사용자</TableCell>
            <TableCell align="right">2024.01.20</TableCell>
          </TableRow>
          <TableRow bordered>
            <TableCell>이영희</TableCell>
            <TableCell>lee@example.com</TableCell>
            <TableCell align="center">사용자</TableCell>
            <TableCell align="right">2024.02.01</TableCell>
          </TableRow>
        </TableBody>
      </Table>
    </TableContainer>
  ),
};

export const Striped: Story = {
  args: {
    striped: true,
    children: null,
  },
  render: (args) => (
    <TableContainer>
      <Table {...args}>
        <TableHeader>
          <TableRow>
            <TableHeaderCell>제품명</TableHeaderCell>
            <TableHeaderCell align="right">가격</TableHeaderCell>
            <TableHeaderCell align="center">재고</TableHeaderCell>
            <TableHeaderCell align="center">상태</TableHeaderCell>
          </TableRow>
        </TableHeader>
        <TableBody>
          {[...Array(5)].map((_, i) => (
            <TableRow key={i}>
              <TableCell>제품 {i + 1}</TableCell>
              <TableCell align="right">{(i + 1) * 10000}원</TableCell>
              <TableCell align="center">{(i + 1) * 5}개</TableCell>
              <TableCell align="center">
                <span
                  style={{
                    padding: "4px 8px",
                    background: i % 2 === 0 ? "#D3F9D8" : "#FFE3E3",
                    color: i % 2 === 0 ? "#51CF66" : "#FF6B6B",
                    borderRadius: "4px",
                    fontSize: "12px",
                  }}
                >
                  {i % 2 === 0 ? "판매중" : "품절"}
                </span>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  ),
};

export const Hoverable: Story = {
  args: {
    hoverable: true,
    children: null,
  },
  render: (args) => (
    <TableContainer>
      <Table {...args}>
        <TableHeader>
          <TableRow bordered>
            <TableHeaderCell>프로젝트</TableHeaderCell>
            <TableHeaderCell>담당자</TableHeaderCell>
            <TableHeaderCell align="center">진행률</TableHeaderCell>
            <TableHeaderCell align="right">마감일</TableHeaderCell>
          </TableRow>
        </TableHeader>
        <TableBody>
          <TableRow hoverable bordered>
            <TableCell>웹사이트 리뉴얼</TableCell>
            <TableCell>김개발</TableCell>
            <TableCell align="center">75%</TableCell>
            <TableCell align="right">2024.03.31</TableCell>
          </TableRow>
          <TableRow hoverable bordered>
            <TableCell>모바일 앱 개발</TableCell>
            <TableCell>이디자인</TableCell>
            <TableCell align="center">45%</TableCell>
            <TableCell align="right">2024.04.30</TableCell>
          </TableRow>
          <TableRow hoverable bordered>
            <TableCell>API 통합</TableCell>
            <TableCell>박백엔드</TableCell>
            <TableCell align="center">90%</TableCell>
            <TableCell align="right">2024.03.15</TableCell>
          </TableRow>
        </TableBody>
      </Table>
    </TableContainer>
  ),
};

export const Clickable: Story = {
  args: {
    children: null,
  },
  render: () => {
    const [selectedRow, setSelectedRow] = useState<number | null>(null);

    return (
      <div>
        <p style={{ marginBottom: "16px" }}>
          선택된 행: {selectedRow !== null ? `Row ${selectedRow + 1}` : "없음"}
        </p>
        <TableContainer>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHeaderCell>주문번호</TableHeaderCell>
                <TableHeaderCell>고객명</TableHeaderCell>
                <TableHeaderCell align="right">금액</TableHeaderCell>
                <TableHeaderCell align="center">상태</TableHeaderCell>
              </TableRow>
            </TableHeader>
            <TableBody>
              {[...Array(5)].map((_, i) => (
                <TableRow
                  key={i}
                  clickable
                  selected={selectedRow === i}
                  onClick={() => setSelectedRow(i)}
                >
                  <TableCell>ORD-{String(i + 1).padStart(5, "0")}</TableCell>
                  <TableCell>고객 {i + 1}</TableCell>
                  <TableCell align="right">{(i + 1) * 50000}원</TableCell>
                  <TableCell align="center">
                    {i % 3 === 0 ? "배송중" : i % 3 === 1 ? "준비중" : "완료"}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </div>
    );
  },
};

export const WithSorting: Story = {
  args: {
    children: null,
  },
  render: () => {
    const [sortConfig, setSortConfig] = useState<{
      key: string;
      direction: "asc" | "desc";
    } | null>(null);

    const data = [
      { id: 1, name: "홍길동", age: 30, department: "개발팀" },
      { id: 2, name: "김철수", age: 25, department: "디자인팀" },
      { id: 3, name: "이영희", age: 35, department: "마케팅팀" },
      { id: 4, name: "박민수", age: 28, department: "개발팀" },
    ];

    const handleSort = (key: string) => {
      let direction: "asc" | "desc" = "asc";
      if (sortConfig?.key === key && sortConfig.direction === "asc") {
        direction = "desc";
      }
      setSortConfig({ key, direction });
    };

    const sortedData = [...data].sort((a, b) => {
      if (!sortConfig) return 0;

      const aValue = a[sortConfig.key as keyof typeof a];
      const bValue = b[sortConfig.key as keyof typeof b];

      if (aValue < bValue) {
        return sortConfig.direction === "asc" ? -1 : 1;
      }
      if (aValue > bValue) {
        return sortConfig.direction === "asc" ? 1 : -1;
      }
      return 0;
    });

    return (
      <TableContainer>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHeaderCell
                sortable
                sorted={
                  sortConfig?.key === "name" ? sortConfig.direction : null
                }
                onSort={() => handleSort("name")}
              >
                이름
              </TableHeaderCell>
              <TableHeaderCell
                sortable
                sorted={sortConfig?.key === "age" ? sortConfig.direction : null}
                onSort={() => handleSort("age")}
                align="center"
              >
                나이
              </TableHeaderCell>
              <TableHeaderCell
                sortable
                sorted={
                  sortConfig?.key === "department" ? sortConfig.direction : null
                }
                onSort={() => handleSort("department")}
              >
                부서
              </TableHeaderCell>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sortedData.map((item) => (
              <TableRow key={item.id}>
                <TableCell>{item.name}</TableCell>
                <TableCell align="center">{item.age}</TableCell>
                <TableCell>{item.department}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    );
  },
};

export const DifferentSizes: Story = {
  args: {
    children: null,
  },
  render: () => (
    <div style={{ display: "flex", flexDirection: "column", gap: "32px" }}>
      <div>
        <h3>Small Size</h3>
        <TableContainer>
          <Table size="sm">
            <TableHeader>
              <TableRow>
                <TableHeaderCell>항목</TableHeaderCell>
                <TableHeaderCell align="right">값</TableHeaderCell>
              </TableRow>
            </TableHeader>
            <TableBody>
              <TableRow>
                <TableCell size="sm">Small Cell</TableCell>
                <TableCell size="sm" align="right">
                  123
                </TableCell>
              </TableRow>
              <TableRow>
                <TableCell size="sm">Another Cell</TableCell>
                <TableCell size="sm" align="right">
                  456
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </TableContainer>
      </div>

      <div>
        <h3>Medium Size (Default)</h3>
        <TableContainer>
          <Table size="md">
            <TableHeader>
              <TableRow>
                <TableHeaderCell>항목</TableHeaderCell>
                <TableHeaderCell align="right">값</TableHeaderCell>
              </TableRow>
            </TableHeader>
            <TableBody>
              <TableRow>
                <TableCell>Medium Cell</TableCell>
                <TableCell align="right">123</TableCell>
              </TableRow>
              <TableRow>
                <TableCell>Another Cell</TableCell>
                <TableCell align="right">456</TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </TableContainer>
      </div>

      <div>
        <h3>Large Size</h3>
        <TableContainer>
          <Table size="lg">
            <TableHeader>
              <TableRow>
                <TableHeaderCell>항목</TableHeaderCell>
                <TableHeaderCell align="right">값</TableHeaderCell>
              </TableRow>
            </TableHeader>
            <TableBody>
              <TableRow>
                <TableCell size="lg">Large Cell</TableCell>
                <TableCell size="lg" align="right">
                  123
                </TableCell>
              </TableRow>
              <TableRow>
                <TableCell size="lg">Another Cell</TableCell>
                <TableCell size="lg" align="right">
                  456
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </TableContainer>
      </div>
    </div>
  ),
};

export const BorderedContainer: Story = {
  args: {
    children: null,
  },
  render: () => (
    <TableContainer bordered>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHeaderCell>카테고리</TableHeaderCell>
            <TableHeaderCell align="right">판매량</TableHeaderCell>
            <TableHeaderCell align="right">매출</TableHeaderCell>
          </TableRow>
        </TableHeader>
        <TableBody>
          <TableRow>
            <TableCell>전자제품</TableCell>
            <TableCell align="right">1,234</TableCell>
            <TableCell align="right">123,456,789원</TableCell>
          </TableRow>
          <TableRow>
            <TableCell>의류</TableCell>
            <TableCell align="right">5,678</TableCell>
            <TableCell align="right">56,789,012원</TableCell>
          </TableRow>
          <TableRow>
            <TableCell>식품</TableCell>
            <TableCell align="right">9,012</TableCell>
            <TableCell align="right">90,123,456원</TableCell>
          </TableRow>
        </TableBody>
      </Table>
    </TableContainer>
  ),
};

export const EmptyData: Story = {
  args: {
    children: null,
  },
  render: () => (
    <TableContainer>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHeaderCell>이름</TableHeaderCell>
            <TableHeaderCell>이메일</TableHeaderCell>
            <TableHeaderCell>역할</TableHeaderCell>
          </TableRow>
        </TableHeader>
        <TableBody>
          <EmptyState message="표시할 데이터가 없습니다" colSpan={3} />
        </TableBody>
      </Table>
    </TableContainer>
  ),
};

export const ResponsiveScroll: Story = {
  args: {
    children: null,
  },
  render: () => (
    <div style={{ maxWidth: "400px" }}>
      <p style={{ marginBottom: "16px" }}>
        좁은 화면에서 가로 스크롤이 가능합니다 →
      </p>
      <TableContainer>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHeaderCell nowrap>주문번호</TableHeaderCell>
              <TableHeaderCell nowrap>고객명</TableHeaderCell>
              <TableHeaderCell nowrap>상품명</TableHeaderCell>
              <TableHeaderCell nowrap align="right">
                수량
              </TableHeaderCell>
              <TableHeaderCell nowrap align="right">
                단가
              </TableHeaderCell>
              <TableHeaderCell nowrap align="right">
                합계
              </TableHeaderCell>
              <TableHeaderCell nowrap align="center">
                상태
              </TableHeaderCell>
              <TableHeaderCell nowrap>주문일</TableHeaderCell>
            </TableRow>
          </TableHeader>
          <TableBody>
            {[...Array(5)].map((_, i) => (
              <TableRow key={i}>
                <TableCell nowrap>
                  ORD-{String(i + 1).padStart(5, "0")}
                </TableCell>
                <TableCell nowrap>고객 {i + 1}</TableCell>
                <TableCell nowrap>상품명 {i + 1}</TableCell>
                <TableCell nowrap align="right">
                  {i + 1}
                </TableCell>
                <TableCell nowrap align="right">
                  10,000원
                </TableCell>
                <TableCell nowrap align="right">
                  {(i + 1) * 10000}원
                </TableCell>
                <TableCell nowrap align="center">
                  배송중
                </TableCell>
                <TableCell nowrap>
                  2024.01.{String(i + 15).padStart(2, "0")}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    </div>
  ),
};
export const CryptoTable: Story = {
  args: {
    children: null,
  },
  render: () => {
    const cryptoData = [
      {
        id: 1,
        icon: "₿",
        name: "비트코인",
        symbol: "BTC",
        price: 129913000,
        change: -1.55,
        high: 133238000,
        low: 129345000,
        volume: 3501,
      },
      {
        id: 2,
        icon: "⬨",
        name: "이더리움",
        symbol: "ETH",
        price: 4230000,
        change: 0.75,
        high: 4358000,
        low: 4184000,
        volume: 54450,
      },
      {
        id: 3,
        icon: "₿",
        name: "비트코인",
        symbol: "BTC",
        price: 129913000,
        change: -1.55,
        high: 133238000,
        low: 129345000,
        volume: 3501,
      },
      {
        id: 4,
        icon: "⬨",
        name: "이더리움",
        symbol: "ETH",
        price: 4230000,
        change: 0.75,
        high: 4358000,
        low: 4184000,
        volume: 54450,
      },
      {
        id: 5,
        icon: "₿",
        name: "비트코인",
        symbol: "BTC",
        price: 129913000,
        change: -1.55,
        high: 133238000,
        low: 129345000,
        volume: 3501,
      },
      {
        id: 6,
        icon: "⬨",
        name: "이더리움",
        symbol: "ETH",
        price: 4230000,
        change: 0.75,
        high: 4358000,
        low: 4184000,
        volume: 54450,
      },
    ];

    const formatNumber = (num: number) => {
      return new Intl.NumberFormat("ko-KR").format(num);
    };

    return (
      <div>
        {/* 상단 타임스탬프 */}
        <div
          style={{
            marginBottom: "16px",
            color: "#868E96",
            fontSize: "14px",
            display: "flex",
            alignItems: "center",
            gap: "8px",
          }}
        >
          <span style={{ color: "#51CF66" }}>●</span>
          실시간 오늘 19:30 기준
        </div>

        <TableContainer>
          <Table hoverable>
            <TableHeader bordered={false}>
              <TableRow>
                <TableHeaderCell>
                  <span
                    style={{
                      fontSize: "12px",
                      fontWeight: "normal",
                      color: "#868E96",
                    }}
                  >
                    코인
                  </span>
                </TableHeaderCell>
                <TableHeaderCell align="right">
                  <span
                    style={{
                      fontSize: "12px",
                      fontWeight: "normal",
                      color: "#868E96",
                    }}
                  >
                    현재가
                  </span>
                </TableHeaderCell>
                <TableHeaderCell align="right">
                  <span
                    style={{
                      fontSize: "12px",
                      fontWeight: "normal",
                      color: "#868E96",
                    }}
                  >
                    변동률
                  </span>
                </TableHeaderCell>
                <TableHeaderCell align="right">
                  <span
                    style={{
                      fontSize: "12px",
                      fontWeight: "normal",
                      color: "#868E96",
                    }}
                  >
                    최고가
                  </span>
                </TableHeaderCell>
                <TableHeaderCell align="right">
                  <span
                    style={{
                      fontSize: "12px",
                      fontWeight: "normal",
                      color: "#868E96",
                    }}
                  >
                    최저가
                  </span>
                </TableHeaderCell>
                <TableHeaderCell align="right">
                  <span
                    style={{
                      fontSize: "12px",
                      fontWeight: "normal",
                      color: "#868E96",
                    }}
                  >
                    거래대금
                  </span>
                </TableHeaderCell>
              </TableRow>
            </TableHeader>
            <TableBody>
              {cryptoData.map((crypto, index) => (
                <TableRow key={crypto.id} hoverable>
                  {/* 코인 이름 */}
                  <TableCell>
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "12px",
                      }}
                    >
                      {/* 순위 별 */}
                      <span
                        style={{
                          color: index % 2 === 0 ? "#FCC419" : "#868E96",
                          fontSize: "16px",
                        }}
                      >
                        {index % 2 === 0 ? "★" : "☆"}
                      </span>
                      {/* 아이콘 */}
                      <div
                        style={{
                          width: "32px",
                          height: "32px",
                          borderRadius: "50%",
                          background:
                            crypto.symbol === "BTC" ? "#F7931A" : "#627EEA",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          color: "white",
                          fontWeight: "bold",
                          fontSize: "16px",
                        }}
                      >
                        {crypto.icon}
                      </div>
                      {/* 이름 */}
                      <span style={{ fontWeight: 500 }}>{crypto.name}</span>
                    </div>
                  </TableCell>

                  {/* 현재가 */}
                  <TableCell align="right">
                    <span style={{ fontWeight: 600 }}>
                      {formatNumber(crypto.price)} 원
                    </span>
                  </TableCell>

                  {/* 변동률 */}
                  <TableCell align="right">
                    <span
                      style={{
                        display: "inline-block",
                        padding: "4px 12px",
                        borderRadius: "4px",
                        fontSize: "14px",
                        fontWeight: 600,
                        minWidth: "72px",
                        textAlign: "center",
                        background: crypto.change > 0 ? "#FFE3E3" : "#D0EBFF",
                        color: crypto.change > 0 ? "#FF6B6B" : "#339AF0",
                      }}
                    >
                      {crypto.change > 0 ? "+" : ""}
                      {crypto.change}%
                    </span>
                  </TableCell>

                  {/* 최고가 */}
                  <TableCell align="right">
                    {formatNumber(crypto.high)} 원
                  </TableCell>

                  {/* 최저가 */}
                  <TableCell align="right">
                    {formatNumber(crypto.low)} 원
                  </TableCell>

                  {/* 거래대금 */}
                  <TableCell align="right">
                    {formatNumber(crypto.volume)} 원
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </div>
    );
  },
};

// ===== Crypto Table with Alternating Colors =====
export const CryptoTableAlternating: Story = {
  args: {
    children: null,
  },
  render: () => {
    const cryptoData = [
      {
        id: 1,
        icon: "₿",
        name: "비트코인",
        price: 129913000,
        change: -1.55,
        high: 133238000,
        low: 129345000,
        volume: 3501,
      },
      {
        id: 2,
        icon: "⬨",
        name: "이더리움",
        price: 4230000,
        change: 0.75,
        high: 4358000,
        low: 4184000,
        volume: 54450,
      },
      {
        id: 3,
        icon: "₿",
        name: "비트코인",
        price: 129913000,
        change: -1.55,
        high: 133238000,
        low: 129345000,
        volume: 3501,
      },
      {
        id: 4,
        icon: "⬨",
        name: "이더리움",
        price: 4230000,
        change: 0.75,
        high: 4358000,
        low: 4184000,
        volume: 54450,
      },
    ];

    const formatNumber = (num: number) => {
      return new Intl.NumberFormat("ko-KR").format(num);
    };

    return (
      <TableContainer>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHeaderCell>코인</TableHeaderCell>
              <TableHeaderCell align="right">현재가</TableHeaderCell>
              <TableHeaderCell align="right">변동률</TableHeaderCell>
              <TableHeaderCell align="right">최고가</TableHeaderCell>
              <TableHeaderCell align="right">최저가</TableHeaderCell>
              <TableHeaderCell align="right">거래대금</TableHeaderCell>
            </TableRow>
          </TableHeader>
          <TableBody>
            {cryptoData.map((crypto, index) => (
              <TableRow
                key={crypto.id}
                style={{
                  background: index % 2 === 0 ? "#FFFFFF" : "#F8F9FA",
                }}
              >
                <TableCell>
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "8px",
                    }}
                  >
                    <div
                      style={{
                        width: "28px",
                        height: "28px",
                        borderRadius: "50%",
                        background: index % 2 === 0 ? "#F7931A" : "#627EEA",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        color: "white",
                        fontSize: "14px",
                        fontWeight: "bold",
                      }}
                    >
                      {crypto.icon}
                    </div>
                    <span>{crypto.name}</span>
                  </div>
                </TableCell>
                <TableCell align="right" style={{ fontFamily: "monospace" }}>
                  {formatNumber(crypto.price)} 원
                </TableCell>
                <TableCell align="right">
                  <span
                    style={{
                      padding: "2px 8px",
                      borderRadius: "4px",
                      fontSize: "13px",
                      fontWeight: 600,
                      background: crypto.change > 0 ? "#FFE3E3" : "#D0EBFF",
                      color: crypto.change > 0 ? "#FF6B6B" : "#339AF0",
                    }}
                  >
                    {crypto.change > 0 ? "+" : ""}
                    {crypto.change}%
                  </span>
                </TableCell>
                <TableCell align="right" style={{ color: "#495057" }}>
                  {formatNumber(crypto.high)} 원
                </TableCell>
                <TableCell align="right" style={{ color: "#495057" }}>
                  {formatNumber(crypto.low)} 원
                </TableCell>
                <TableCell align="right" style={{ color: "#495057" }}>
                  {formatNumber(crypto.volume)} 원
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    );
  },
};

// ===== Minimal Crypto Table =====
export const CryptoTableMinimal: Story = {
  args: {
    children: null,
  },
  render: () => {
    const cryptoData = [
      { symbol: "BTC", price: 129913000, change: -1.55 },
      { symbol: "ETH", price: 4230000, change: 0.75 },
      { symbol: "BNB", price: 913000, change: 2.15 },
      { symbol: "SOL", price: 213000, change: -0.85 },
      { symbol: "XRP", price: 1230, change: 3.25 },
    ];

    return (
      <TableContainer bordered>
        <Table size="sm">
          <TableHeader>
            <TableRow>
              <TableHeaderCell>심볼</TableHeaderCell>
              <TableHeaderCell align="right">가격</TableHeaderCell>
              <TableHeaderCell align="right">24h %</TableHeaderCell>
            </TableRow>
          </TableHeader>
          <TableBody>
            {cryptoData.map((crypto) => (
              <TableRow key={crypto.symbol} hoverable>
                <TableCell>
                  <span style={{ fontWeight: 600 }}>{crypto.symbol}</span>
                </TableCell>
                <TableCell align="right">
                  ₩{crypto.price.toLocaleString()}
                </TableCell>
                <TableCell align="right">
                  <span
                    style={{
                      color: crypto.change > 0 ? "#51CF66" : "#FF6B6B",
                      fontWeight: 600,
                    }}
                  >
                    {crypto.change > 0 ? "+" : ""}
                    {crypto.change}%
                  </span>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    );
  },
};
