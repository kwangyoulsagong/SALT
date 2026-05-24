import React, { useEffect, useMemo, useState } from "react";
import { createRoot } from "react-dom/client";

const h = React.createElement;
const now = () => new Date().toISOString();

const initialMarkets = [
  market("BTC", "비트코인", "Bitcoin", 129913000, -1.55, 133238000, 129345000, 350100000000),
  market("ETH", "이더리움", "Ethereum", 4230000, 0.75, 4358000, 4184000, 54450000000),
  market("SOL", "솔라나", "Solana", 287300, 3.42, 292100, 274000, 19600000000),
  market("XRP", "리플", "Ripple", 1870, 1.32, 1930, 1760, 11800000000),
  market("ADA", "에이다", "Cardano", 1180, -0.64, 1215, 1120, 8200000000),
  market("AVAX", "아발란체", "Avalanche", 56200, 6.14, 57100, 51400, 7100000000),
  market("LINK", "체인링크", "Chainlink", 24800, -0.52, 25400, 24100, 4300000000),
  market("DOGE", "도지코인", "Dogecoin", 312, 2.21, 327, 301, 12200000000),
];

const initialHoldings = [
  holding("BTC", "비트코인", 0.0245, 98000000, 129913000, 32.56, 60),
  holding("ETH", "이더리움", 1.52, 3850000, 4230000, 9.87, 18),
  holding("SOL", "솔라나", 12.5, 245000, 287300, 17.27, 14),
  holding("XRP", "리플", 5200, 1650, 1870, 13.33, 8),
];

const initialStrategies = [
  strategy("st-1", "BTC RSI < 30", "RSI 30 이하 · 자동 제안", "전략 실행", true, "BTC"),
  strategy("st-2", "ETH 변동률 8%", "8% 이상 변동 · 리스크 점검", "알림", true, "ETH"),
  strategy("st-3", "SOL Smart Zone 도달", "120,000 ~ 125,000원 구간", "알림", true, "SOL"),
  strategy("st-4", "BTC 자금 흐름 감지", "대량 자금 흐름 10M+ USD", "알림", true, "BTC"),
  strategy("st-5", "시장 Fear > 75", "전체 시장 공포 · 분할 관찰", "전략 실행", false, "BTC/ETH"),
];

const initialTriggers = [
  trigger("10:32", "BTC RSI 28 도달", "Binance · 자동 제일", "전략 실행", "+5,700원", "success"),
  trigger("09:45", "ETH 8% 상승", "Kraken · 완료", "리스크 알림", "+12,340원", "danger"),
  trigger("08:20", "SOL Zone 도달", "Coinbase", "알림 전송", "120,400원", "info"),
  trigger("07:10", "자금 흐름 감지 (BTC)", "Glassnode", "알림 전송", "+9,120원", "warning"),
  trigger("06:55", "시장 공포 지수 78", "Auto", "BTC/ETH 관찰", "+7,450원", "success"),
];

const initialAlerts = [
  alertItem("al-1", "Smart Zone 도달 (ETH)", "2분 전", true, "spark"),
  alertItem("al-2", "BTC 자금 흐름 감지", "5분 전", true, "flow"),
  alertItem("al-3", "BTC RSI 30 이하", "12분 전", true, "btc"),
  alertItem("al-4", "ETH 8% 상승", "30분 전", false, "eth"),
  alertItem("al-5", "SOL 전략 조건 완료", "1시간 전", false, "sol"),
  alertItem("al-6", "시장 변동성 증가", "2시간 전", false, "risk"),
];

const initialWatchlist = [
  { id: "wl-1", symbol: "BTC", label: "가격 회복", target: 130000000, active: true },
  { id: "wl-2", symbol: "SOL", label: "Smart Zone", target: 250000, active: true },
  { id: "wl-3", symbol: "AVAX", label: "거래량 급증", target: 59000, active: false },
];

const initialInsights = [
  insight("ins-1", "AI 코치 추천", "BTC 분할 관찰 추천", "포트폴리오 리스크 완화 전략", 87, "ai"),
  insight("ins-2", "Smart Zone", "126M ~ 127.5M", "현재가가 관찰 구간에 접근 중", 80, "zone"),
  insight("ins-3", "시장 상태", "Bearish", "공포탐욕지수 24 · AI 신뢰도 87%", 87, "regime"),
  insight("ins-4", "집중도 리스크", "BTC 비중 60%", "단일 자산 집중도가 높습니다.", 72, "risk"),
];

const initialNews = [
  newsItem("The $1.7B Bitcoin Bet on Rally Above $100K", "BTC", "긍정", "기관성 자금 흐름과 옵션 포지션이 함께 증가했습니다."),
  newsItem("Ethereum fee pressure eases", "ETH", "중립", "네트워크 수수료 부담이 완화됐습니다."),
  newsItem("Solana ecosystem volume expands", "SOL", "긍정", "DEX 거래량과 신규 지갑 활동이 늘었습니다."),
];

const initialDrawings = [
  drawing("dr-1", "BTC", "삼각수렴 패턴 분석", "목표가 140M", "삼각수렴", 284, 1820),
  drawing("dr-2", "BTC", "지지선 126M 강력", "Smart Zone 포착", "지지선", 197, 1340),
  drawing("dr-3", "ETH", "엘리어트 파동 5파", "목표가 분석", "엘리어트", 156, 980),
];

function market(symbol, koreanName, englishName, currentPrice, change24h, high24h, low24h, tradeValue24h) {
  return { symbol, market: `KRW-${symbol}`, koreanName, englishName, currentPrice, change24h, high24h, low24h, tradeValue24h, priceUpdatedAt: now() };
}

function holding(symbol, name, quantity, averagePrice, currentPrice, profitRate, weight) {
  return { symbol, name, quantity, averagePrice, currentPrice, value: quantity * currentPrice, profitRate, weight };
}

function strategy(id, title, condition, action, active, symbol) {
  return { id, title, condition, action, active, symbol };
}

function trigger(time, title, source, action, value, tone) {
  return { id: `${time}-${title}`, time, title, source, action, value, tone };
}

function alertItem(id, title, time, unread, icon) {
  return { id, title, time, unread, icon };
}

function insight(id, label, title, summary, confidence, type) {
  return { id, label, title, summary, confidence, type, createdAt: now() };
}

function newsItem(title, symbol, sentiment, summary) {
  return { id: `${symbol}-${title}`, title, symbol, sentiment, summary, publishedAt: now(), bookmarked: symbol === "BTC" };
}

function drawing(id, symbol, title, subtitle, tag, likes, views) {
  return { id, symbol, title, subtitle, tag, likes, views, createdAt: now() };
}

function App() {
  const [tab, setTab] = useState("intelligence");
  const [subTab, setSubTab] = useState("ai");
  const [markets, setMarkets] = useState(initialMarkets);
  const [selectedSymbol, setSelectedSymbol] = useState("BTC");
  const [strategies, setStrategies] = useState(initialStrategies);
  const [triggers, setTriggers] = useState(initialTriggers);
  const [alerts, setAlerts] = useState(initialAlerts);
  const [watchlist, setWatchlist] = useState(initialWatchlist);
  const [holdings, setHoldings] = useState(initialHoldings);
  const [insights, setInsights] = useState(initialInsights);
  const [news, setNews] = useState(initialNews);
  const [drawings, setDrawings] = useState(initialDrawings);
  const [contractKey, setContractKey] = useState("marketOverview");
  const [modal, setModal] = useState(null);
  const [socketEvents, setSocketEvents] = useState([
    { type: "subscribed", symbols: ["BTC", "ETH", "SOL"] },
    { type: "price_update", data: { symbol: "BTC", currentPrice: 129913000, change24h: -1.55, timestamp: now() } },
    { type: "candle", symbol: "BTC", timeframe: "5m", data: candle(129913000) },
  ]);

  const selected = useMemo(() => markets.find((item) => item.symbol === selectedSymbol) ?? markets[0], [markets, selectedSymbol]);
  const contracts = useMemo(() => buildContracts({ markets, watchlist, holdings, strategies, triggers, alerts, insights, news, drawings }), [markets, watchlist, holdings, strategies, triggers, alerts, insights, news, drawings]);

  useEffect(() => {
    const id = setInterval(() => {
      setMarkets((prev) => {
        const next = prev.map((item) => {
          if (item.symbol !== selectedSymbol) return item;
          const drift = 1 + (Math.random() - 0.51) / 180;
          return { ...item, currentPrice: Math.round(item.currentPrice * drift), change24h: Number((item.change24h + (Math.random() - 0.5) * 0.18).toFixed(2)), priceUpdatedAt: now() };
        });
        const focused = next.find((item) => item.symbol === selectedSymbol) ?? next[0];
        setSocketEvents((prevEvents) => [
          { type: "price_update", data: { symbol: focused.symbol, currentPrice: focused.currentPrice, change24h: focused.change24h, timestamp: now() } },
          { type: "candle", symbol: focused.symbol, timeframe: "5m", data: candle(focused.currentPrice) },
          ...prevEvents,
        ].slice(0, 8));
        return next;
      });
    }, 2200);
    return () => clearInterval(id);
  }, [selectedSymbol]);

  const actions = {
    toggleStrategy(id) {
      setStrategies((prev) => prev.map((item) => item.id === id ? { ...item, active: !item.active } : item));
    },
    addStrategy() {
      const item = strategy(`st-${Date.now()}`, `${selectedSymbol} 변동성 전략`, "변동성 확대 · 리스크 점검", "알림", true, selectedSymbol);
      setStrategies((prev) => [item, ...prev]);
      setModal(null);
    },
    runStrategy(id) {
      const item = strategies.find((target) => target.id === id);
      setTriggers((prev) => [trigger(new Date().toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit" }), item?.title ?? "전략 조건", "Auto", "전략 실행", "완료", "success"), ...prev]);
      setAlerts((prev) => [alertItem(`al-${Date.now()}`, `${item?.title ?? "전략"} 실행 완료`, "방금 전", true, "spark"), ...prev]);
      setModal(null);
    },
    toggleAlert(id) {
      setAlerts((prev) => prev.map((item) => item.id === id ? { ...item, unread: !item.unread } : item));
    },
    addAlert() {
      setAlerts((prev) => [alertItem(`al-${Date.now()}`, `${selectedSymbol} 조건 알림`, "방금 전", true, selectedSymbol.toLowerCase()), ...prev]);
      setModal(null);
    },
    addWatchlist() {
      if (!watchlist.some((item) => item.symbol === selectedSymbol)) {
        setWatchlist((prev) => [{ id: `wl-${Date.now()}`, symbol: selectedSymbol, label: "사용자 추가", target: selected.currentPrice, active: true }, ...prev]);
      }
      setModal(null);
    },
    toggleWatch(id) {
      setWatchlist((prev) => prev.map((item) => item.id === id ? { ...item, active: !item.active } : item));
    },
    addHoldingRecord() {
      setHoldings((prev) => prev.map((item) => item.symbol === selectedSymbol ? { ...item, quantity: Number((item.quantity * 1.02).toFixed(4)), value: item.value * 1.02 } : item));
      setModal(null);
    },
    addInsight() {
      setInsights((prev) => [insight(`ins-${Date.now()}`, "AI 코치", `${selectedSymbol} 리스크 점검`, "사용자 액션 후보가 생성되었습니다.", 82, "ai"), ...prev]);
      setModal(null);
    },
    toggleBookmark(id) {
      setNews((prev) => prev.map((item) => item.id === id ? { ...item, bookmarked: !item.bookmarked } : item));
    },
    addDrawing() {
      setDrawings((prev) => [drawing(`dr-${Date.now()}`, selectedSymbol, `${selectedSymbol} 사용자 드로잉`, "새 지지/저항 구간", "사용자", 0, 0), ...prev]);
      setModal(null);
    },
  };

  return h("main", { className: "page" }, [
    h(AppHeader, { key: "header", unreadCount: alerts.filter((item) => item.unread).length }),
    h(PageHero, { key: "hero", tab, setTab, strategies, triggers, alerts, holdings }),
    tab === "automation" && h(AutomationWorkspace, { key: "automation", strategies, triggers, alerts, actions, setModal }),
    tab === "market" && h(MarketWorkspace, { key: "market", markets, selected, selectedSymbol, setSelectedSymbol, watchlist, actions, setModal }),
    tab === "portfolio" && h(PortfolioWorkspace, { key: "portfolio", holdings, insights, actions, setModal }),
    tab === "intelligence" && h(IntelligenceWorkspace, { key: "intelligence", selected, insights, subTab, setSubTab, drawings, actions, setModal }),
    tab === "content" && h(ContentWorkspace, { key: "content", insights, news, drawings, actions, setModal }),
    tab === "contract" && h(ContractWorkspace, { key: "contract", contracts, contractKey, setContractKey, socketEvents }),
    modal && h(Modal, { key: "modal", modal, selected, actions, setModal }),
  ]);
}

function AppHeader({ unreadCount }) {
  return h("header", { className: "appHeader" }, [
    h("div", { className: "brandTitle", key: "brand" }, [h("span", { className: "bolt" }, "↯"), h("strong", null, "자동 전략 / 알림")]),
    h("label", { className: "searchBox", key: "search" }, [h("span", null, "⌕"), h("input", { placeholder: "코인, 조건 검색" })]),
    h("div", { className: "headerTools", key: "tools" }, [h("button", null, ["♢", unreadCount > 0 && h("em", { key: "count" }, unreadCount)]), h("button", null, "⚙"), h("button", null, "●")]),
  ]);
}

function PageHero({ tab, setTab, strategies, triggers, alerts, holdings }) {
  const tabs = [["automation", "내 전략"], ["market", "실시간 차트"], ["portfolio", "포트폴리오"], ["intelligence", "상세보기"], ["content", "드로잉/뉴스"], ["contract", "계약 확인"]];
  const totalValue = holdings.reduce((sum, item) => sum + item.value, 0);
  return h("section", { className: "hero" }, [
    h("nav", { className: "mainTabs", key: "tabs" }, tabs.map(([value, label]) => h("button", { key: value, className: tab === value ? "active" : "", onClick: () => setTab(value) }, label))),
    h("div", { className: "statGrid", key: "stats" }, [
      stat("활성 전략", `${strategies.filter((item) => item.active).length}개`, "실행 중", "green"),
      stat("오늘 트리거", `${triggers.length}건`, "자동 감지", "blue"),
      stat("알림 수신", `${alerts.length}건`, "읽지 않음 포함", "orange"),
      stat("포트폴리오", `${Math.round(totalValue / 10000)}만`, "+14.3%", "green"),
    ]),
  ]);
}

function stat(label, value, desc, tone) {
  return h("article", { className: `statCard ${tone}` }, [h("span", null, label), h("strong", null, value), h("small", null, desc)]);
}

function AutomationWorkspace({ strategies, triggers, alerts, actions, setModal }) {
  return h("section", { className: "automationBoard" }, [
    h("article", { className: "panel strategiesPanel" }, [
      h(SectionHead, { title: "내 전략 (Playbook)", desc: "조건 기반 자동 감지와 알림 실행", action: h("button", { className: "primaryBtn", onClick: () => setModal({ type: "strategyCreate" }) }, "+ 전략 추가") }),
      ...strategies.map((item) => h("div", { className: "strategyRow", key: item.id }, [
        h("button", { className: "coinBadge", onClick: () => setModal({ type: "strategyDetail", item }) }, item.symbol.slice(0, 1)),
        h("button", { className: "strategyCopy", onClick: () => setModal({ type: "strategyDetail", item }) }, [h("strong", null, item.title), h("span", null, item.condition)]),
        h("button", { className: "pill", onClick: () => actions.runStrategy(item.id) }, item.action),
        h("button", { className: item.active ? "switch on" : "switch", onClick: () => actions.toggleStrategy(item.id) }, h("span", null)),
      ])),
    ]),
    h("article", { className: "panel triggerPanel" }, [
      h(SectionHead, { title: "트리거 기록", desc: "전략 조건이 감지된 순서", action: h("button", { className: "smallBtn" }, "오늘") }),
      h("div", { className: "timeline" }, triggers.map((item) => h("button", { className: `triggerRow ${item.tone}`, key: item.id, onClick: () => setModal({ type: "triggerDetail", item }) }, [
        h("span", { className: "time" }, item.time),
        h("span", { className: "dot" }),
        h("span", { className: "triggerCopy" }, [h("strong", null, item.title), h("small", null, item.source)]),
        h("span", { className: "triggerAction" }, item.action),
        h("em", null, item.value),
      ]))),
    ]),
    h("article", { className: "panel alertPanel" }, [
      h(SectionHead, { title: "알림", desc: "실시간 / 히스토리", action: h("button", { className: "smallBtn", onClick: () => setModal({ type: "alertCreate" }) }, "+") }),
      h("div", { className: "subTabs" }, [h("button", { className: "active" }, "실시간"), h("button", null, "히스토리")]),
      ...alerts.map((item) => h("button", { className: item.unread ? "alertRow unread" : "alertRow", key: item.id, onClick: () => actions.toggleAlert(item.id) }, [h("span", { className: "alertIcon" }, iconFor(item.icon)), h("strong", null, item.title), h("small", null, item.time)])),
      h("button", { className: "readAllBtn", onClick: () => alerts.forEach((item) => item.unread && actions.toggleAlert(item.id)) }, "모두 읽음"),
    ]),
    h("article", { className: "panel performancePanel" }, [
      h(SectionHead, { title: "전략 성과 (30일)", desc: "수익, 승률, 실행 수" }),
      h("div", { className: "perfGrid" }, [perf("수익", "+14.3%", 78, "green"), perf("승률", "82%", 88, "blue"), perf("실행", "27회", 58, "purple")]),
    ]),
  ]);
}

function MarketWorkspace({ markets, selected, selectedSymbol, setSelectedSymbol, watchlist, actions, setModal }) {
  return h("section", { className: "marketBoard" }, [
    h("article", { className: "marketTablePanel" }, [
      h(SectionHead, { title: "투자 분석", desc: "실시간 차트와 관심 종목" }),
      h("div", { className: "filterBar" }, ["전체", "거래대금", "변동률", "가격", "이름", "오름차순", "내림차순"].map((item, index) => h("button", { key: item, className: index === 0 ? "active" : "" }, item))),
      h("div", { className: "marketTable" }, [
        h("div", { className: "marketRow head", key: "head" }, ["", "자산", "현재가", "변동률", "최고가", "최저가", "거래대금"].map((item) => h("span", { key: item }, item))),
        ...markets.concat(markets.slice(0, 6)).map((item, index) => h("button", { className: item.symbol === selectedSymbol ? "marketRow selected" : "marketRow", key: `${item.symbol}-${index}`, onMouseEnter: () => setSelectedSymbol(item.symbol), onClick: () => setModal({ type: "assetDetail", asset: item }) }, [
          h("span", { className: watchlist.some((watch) => watch.symbol === item.symbol) ? "star active" : "star" }, "★"),
          h("span", { className: "assetName" }, [h("span", { className: "coinBadge" }, item.symbol.slice(0, 1)), h("strong", null, item.koreanName)]),
          h("span", null, `${format(item.currentPrice)}원`),
          h("span", { className: rateClass(item.change24h) }, `${item.change24h > 0 ? "+" : ""}${item.change24h}%`),
          h("span", null, `${format(item.high24h)}원`),
          h("span", null, `${format(item.low24h)}원`),
          h("span", null, `${Math.round(item.tradeValue24h / 100000000)}억`),
        ])),
      ]),
    ]),
    h("aside", { className: "rightAnalysis" }, [
      h(AssetSummary, { selected, actions, setModal }),
      h(TradingChart, { selected, large: false }),
      h(SentimentBlock, null),
      h(SmartMoneyBlock, null),
      h(WatchlistBlock, { watchlist, actions, setModal }),
    ]),
  ]);
}

function AssetSummary({ selected, actions, setModal }) {
  return h("article", { className: "analysisCard assetSummary" }, [
    h("div", { className: "assetTop" }, [h("span", { className: "coinBadge" }, selected.symbol.slice(0, 1)), h("div", null, [h("strong", null, selected.koreanName), h("span", null, `${format(selected.currentPrice)}원 · ${selected.change24h > 0 ? "+" : ""}${selected.change24h}%`)])]),
    h("h3", null, "AI 투자 분석"),
    h("h2", null, `${selected.symbol} 분할 관찰 추천`),
    h("p", null, "포트폴리오 리스크를 완화하면서 주요 가격 구간을 관찰합니다."),
    h("div", { className: "signalList" }, [h("span", null, "시장 상태 Neutral"), h("span", null, `${selected.symbol} 비중 점검`), h("span", null, "RSI 31")]),
    h("div", { className: "confidence" }, [h("span", null, "신뢰도 82%"), h("i", null)]),
    h("div", { className: "quickActions" }, [h("button", { className: "primaryBtn", onClick: () => setModal({ type: "assetDetail", asset: selected }) }, "상세보기"), h("button", { className: "ghostBtn", onClick: actions.addWatchlist }, "관심 추가"), h("button", { className: "ghostBtn", onClick: () => setModal({ type: "alertCreate" }) }, "알림")]),
  ]);
}

function PortfolioWorkspace({ holdings, insights, actions, setModal }) {
  const totalValue = holdings.reduce((sum, item) => sum + item.value, 0);
  const invested = holdings.reduce((sum, item) => sum + item.quantity * item.averagePrice, 0);
  const profit = totalValue - invested;
  return h("section", { className: "portfolioBoard" }, [
    h("div", { className: "portfolioHead" }, [h("div", null, [h("h1", null, "포트폴리오"), h("p", null, "보유 자산 현황 및 성과 분석")]), h("button", { className: "primaryBtn", onClick: () => setModal({ type: "holdingRecord" }) }, "+ 기록 추가")]),
    h("div", { className: "statGrid portfolioStats" }, [stat("총 평가금액", `₩${formatShort(totalValue)}`, "💰", "blue"), stat("총 투자금액", `₩${formatShort(invested)}`, "💵", "green"), stat("평가손익", `+₩${formatShort(profit)}`, "📈", "green"), stat("전체 수익률", "+15.24%", "🎯", "green")]),
    h("article", { className: "panel full" }, [h(SectionHead, { title: "포트폴리오 수익 흐름", desc: "기간별 평가금액 변화" }), h(LineChart, null)]),
    h(RiskPanel, null),
    h("article", { className: "panel holdingsPanel" }, [
      h("div", { className: "subTabs" }, [h("button", { className: "active" }, "보유자산"), h("button", null, "기록내역")]),
      ...holdings.map((item) => h("button", { className: "holdingRow", key: item.symbol, onClick: () => setModal({ type: "holdingDetail", item }) }, [h("span", { className: "coinBadge" }, item.symbol.slice(0, 1)), h("span", null, [h("strong", null, item.name), h("small", null, item.symbol)]), h("span", null, item.quantity), h("span", null, `${format(item.averagePrice)}원`), h("span", null, `${format(item.currentPrice)}원`), h("span", { className: "rate up" }, `+${item.profitRate}%`)])),
    ]),
    h("article", { className: "panel insightSide" }, [h(SectionHead, { title: "리스크 인사이트", desc: "자동 감지된 점검 항목" }), ...insights.map((item) => h("button", { className: "compactInsight", key: item.id, onClick: () => setModal({ type: "insightDetail", item }) }, [h("strong", null, item.title), h("span", null, item.summary)]))]),
  ]);
}

function IntelligenceWorkspace({ selected, insights, subTab, setSubTab, drawings, actions, setModal }) {
  const tabs = [["ai", "AI 분석"], ["whale", "자금 신호"], ["drawing", "드로잉"], ["mine", "내 보유"]];
  return h("section", { className: "detailWorkspace" }, [
    h("article", { className: "terminal" }, [
      h("div", { className: "terminalTop" }, [
        h("button", { className: "backBtn" }, "← 목록"),
        h("span", { className: "coinBadge" }, selected.symbol.slice(0, 1)),
        h("strong", null, selected.koreanName),
        h("small", null, `${selected.symbol}/KRW`),
        h("b", null, `${format(selected.currentPrice)}원`),
        h("em", { className: rateClass(selected.change24h) }, `${selected.change24h > 0 ? "+" : ""}${selected.change24h}%`),
        h("button", { className: "terminalIcon" }, "★"),
        h("button", { className: "terminalAction", onClick: () => setModal({ type: "alertCreate" }) }, "알림"),
        h("button", { className: "terminalAction pink", onClick: actions.addWatchlist }, "관심"),
      ]),
      h("div", { className: "terminalBody" }, [
        h("div", { className: "chartZone" }, [
          h("div", { className: "chartTabs" }, ["1분", "5분", "15분", "1시간", "4시간", "1일", "1주", "1월"].map((item) => h("button", { className: item === "1일" ? "active" : "", key: item }, item))),
          h(TradingChart, { selected, large: true, dark: true }),
        ]),
        h(OrderBook, { selected }),
      ]),
      h("div", { className: "terminalTabs" }, tabs.map(([value, label]) => h("button", { key: value, className: subTab === value ? "active" : "", onClick: () => setSubTab(value) }, label))),
      h("div", { className: "terminalPanel" }, [
        subTab === "ai" && h("div", { className: "terminalCards" }, insights.slice(0, 3).map((item) => h("button", { className: `terminalCard ${item.type}`, key: item.id, onClick: () => setModal({ type: "insightDetail", item }) }, [h("span", null, item.label), h("strong", null, item.title), h("p", null, item.summary), h("small", null, `신뢰도 ${item.confidence}%`)]))),
        subTab === "whale" && h(WhaleSignals, null),
        subTab === "drawing" && h(DrawingList, { drawings, actions, setModal }),
        subTab === "mine" && h("div", { className: "terminalCards" }, [h("div", { className: "terminalCard" }, [h("span", null, "보유"), h("strong", null, "BTC 비중 60%"), h("p", null, "집중도가 높아 리밸런싱 검토가 필요합니다.")]), h("button", { className: "terminalCard", onClick: () => setModal({ type: "holdingRecord" }) }, [h("span", null, "기록"), h("strong", null, "보유 기록 추가"), h("p", null, "새 입출금 또는 수량 변동을 기록합니다.")])]),
      ]),
    ]),
    h("article", { className: "panel full whiteMatchPanel" }, [h(SectionHead, { title: "기술 지표", desc: "RSI, 이동평균, 거래량" }), h(TechnicalPanel, null)]),
  ]);
}

function ContentWorkspace({ insights, news, drawings, actions, setModal }) {
  return h("section", { className: "contentBoard" }, [
    h("article", { className: "panel" }, [h(SectionHead, { title: "투자 피드", desc: "AI, 리스크, 뉴스, 드로잉 통합" }), ...insights.map((item) => h("button", { className: "feedRow", key: item.id, onClick: () => setModal({ type: "insightDetail", item }) }, [h("span", { className: "chip" }, item.label), h("strong", null, item.title), h("p", null, item.summary)]))]),
    h("article", { className: "panel" }, [h(SectionHead, { title: "뉴스 / 북마크", desc: "자산별 뉴스 분위기와 저장 상태" }), ...news.map((item) => h("button", { className: "newsRow", key: item.id, onClick: () => actions.toggleBookmark(item.id) }, [h("strong", null, item.title), h("span", null, item.symbol), h("em", { className: item.bookmarked ? "state on" : "state" }, item.bookmarked ? "저장됨" : "저장")]))]),
    h("article", { className: "panel full" }, [h(SectionHead, { title: "커뮤니티 드로잉", desc: "패턴, 지지선, 목표가 공유", action: h("button", { className: "primaryBtn", onClick: actions.addDrawing }, "+ 드로잉 추가") }), h(DrawingList, { drawings, actions, setModal })]),
  ]);
}

function ContractWorkspace({ contracts, contractKey, setContractKey, socketEvents }) {
  const current = contracts[contractKey];
  return h("section", { className: "contractBoard" }, [
    h("article", { className: "panel" }, [h(SectionHead, { title: "REST 응답 계약", desc: "현재 화면 더미 데이터 shape" }), h("div", { className: "contractTabs" }, Object.keys(contracts).map((key) => h("button", { key, className: key === contractKey ? "active" : "", onClick: () => setContractKey(key) }, key))), h("div", { className: "endpoint" }, [h("strong", null, current.method), h("span", null, current.path)]), h("pre", null, JSON.stringify(current.response, null, 2))]),
    h("article", { className: "panel" }, [h(SectionHead, { title: "WebSocket 메시지 계약", desc: "BFF 이벤트와 동일한 타입" }), ...socketEvents.map((event, index) => h("pre", { key: index }, JSON.stringify(event, null, 2)))]),
  ]);
}

function SectionHead({ title, desc, action }) {
  return h("div", { className: "sectionHead" }, [h("div", null, [h("h2", null, title), h("p", null, desc)]), action]);
}

function TradingChart({ selected = initialMarkets[0], large, dark }) {
  const candles = [54, 72, 67, 44, 38, 51, 59, 63, 49, 56, 74, 69, 62, 79, 83, 76, 71, 88, 81, 85, 73, 78];
  return h("div", { className: `${large ? "tradingChart large" : "tradingChart"}${dark ? " darkChart" : ""}` }, [
    !dark && h("div", { className: "chartToolbar", key: "toolbar" }, [h("span", null, "1분"), h("span", null, "5분"), h("span", null, "15분"), h("span", { className: "active" }, "1일"), h("strong", null, `${selected.symbol} ${format(selected.currentPrice)}원`)]),
    h("svg", { key: "svg", viewBox: "0 0 720 260", preserveAspectRatio: "none" }, [
      ...[0, 1, 2, 3, 4].map((line) => h("line", { key: `g-${line}`, x1: 0, x2: 720, y1: 40 + line * 42, y2: 40 + line * 42, className: "gridLine" })),
      ...candles.map((height, index) => {
        const x = 24 + index * 30;
        const y = 210 - height * 1.8;
        const up = index % 3 !== 0;
        return h("g", { key: index }, [h("line", { x1: x + 5, x2: x + 5, y1: y - 22, y2: y + 52, className: up ? "wick up" : "wick down" }), h("rect", { x, y, width: 10, height: Math.max(24, height), rx: 2, className: up ? "candle up" : "candle down" })]);
      }),
      h("rect", { x: 70, y: 85, width: 280, height: 54, rx: 4, className: "zoneRect" }),
      h("text", { x: 82, y: 116, className: "zoneText" }, "Smart Zone 126M ~ 127.5M"),
      h("text", { x: 585, y: 104, className: "priceTag" }, "12706만원"),
    ]),
    h("div", { key: "rsi", className: "rsiPanel" }, [h("span", null, "RSI(14)"), h("b", null, "31.2"), h("i", null)]),
  ]);
}

function OrderBook({ selected }) {
  const asks = [129998000, 130083000, 130168000, 130253000, 130338000, 130423000, 130508000, 130593000, 130678000, 130763000];
  const bids = [129828000, 129743000, 129658000, 129573000, 129488000, 129403000, 129318000, 129233000, 129148000, 129063000];
  return h("aside", { className: "orderBook" }, [
    h("div", { className: "orderTabs" }, [h("button", { className: "active" }, "호가"), h("button", null, "체결"), h("button", null, "정보")]),
    h("div", { className: "orderHead" }, [h("span", null, "가격(원)"), h("span", null, "수량"), h("span", null, "잔량")]),
    ...asks.map((price, index) => h("div", { className: "orderRow ask", key: `a-${price}` }, [h("strong", null, format(price)), h("span", null, (1.79 - index * 0.13).toFixed(4)), h("em", { style: { width: `${80 - index * 5}%` } }, `${(2.34 - index * 0.19).toFixed(2)}억`)])),
    h("div", { className: "currentPrice" }, [h("strong", null, `${format(selected.currentPrice)}`), h("span", null, `${selected.change24h > 0 ? "+" : ""}${selected.change24h}%`)]),
    ...bids.map((price, index) => h("div", { className: "orderRow bid", key: `b-${price}` }, [h("strong", null, format(price)), h("span", null, (1.59 - index * 0.11).toFixed(4)), h("em", { style: { width: `${72 - index * 4}%` } }, `${(2.08 - index * 0.15).toFixed(2)}억`)])),
    h("div", { className: "orderRatio" }, [h("span", null, "상승 58.3%"), h("i", null), h("span", null, "하락 41.7%")]),
  ]);
}

function LineChart() {
  return h("svg", { className: "lineChart", viewBox: "0 0 900 300", preserveAspectRatio: "none" }, [
    ...[0, 1, 2, 3].map((line) => h("line", { key: line, x1: 40, x2: 860, y1: 55 + line * 58, y2: 55 + line * 58, className: "gridLine" })),
    h("rect", { x: 390, y: 55, width: 110, height: 174, className: "lossZone" }),
    h("polyline", { points: "40,215 70,185 100,195 135,184 165,192 190,220 230,205 260,185 290,179 320,120 350,100 380,124 410,150 450,180 485,130 520,118 550,88 585,88 620,145 660,150 700,125 740,125 785,70 820,92 855,80 880,30", className: "portfolioLine" }),
    h("text", { x: 430, y: 126, className: "lossText" }, "-7.5%"),
  ]);
}

function RiskPanel() {
  return h("article", { className: "panel riskPanel full" }, [
    h(SectionHead, { title: "리스크 분석", desc: "집중도/낙폭/변동성 레이더" }),
    h("div", { className: "riskLayout" }, [
      h("div", { className: "radar" }, [h("span", null, "집중도"), h("svg", { viewBox: "0 0 160 160" }, [h("polygon", { points: "80,18 140,60 118,135 42,135 20,60", className: "radarGrid" }), h("polygon", { points: "80,48 111,70 94,112 56,105 46,72", className: "radarShape" })])]),
      h("div", { className: "riskSummary" }, [h("strong", null, "안전"), h("span", null, "전체 리스크 수준"), h("b", null, "32"), ["집중도", "변동성", "낙폭", "RSI 과열", "분산 부족"].map((label, index) => h("div", { className: "riskBar", key: label }, [h("span", null, label), h("i", { style: { width: `${42 + index * 4}%` } }), h("em", null, `${index === 2 ? 20 : 42 + index * 4}`)]))]),
    ]),
  ]);
}

function TechnicalPanel() {
  return h("div", { className: "technical" }, [
    h("div", { className: "gaugeCard" }, [h("div", { className: "semiGauge" }, "31.2"), h("strong", null, "중립")]),
    h("div", { className: "rsiHistory" }, [h("span", null, "RSI(14) 히스토리 최근 60분"), h("svg", { viewBox: "0 0 480 120", preserveAspectRatio: "none" }, [h("line", { x1: 0, x2: 480, y1: 28, y2: 28, className: "dangerLine" }), h("line", { x1: 0, x2: 480, y1: 78, y2: 78, className: "safeLine" }), h("polyline", { points: "0,72 40,58 80,52 120,60 160,62 200,70 240,84 280,86 320,78 360,72 400,76 440,82 480,90", className: "rsiLine" })])]),
    h("div", { className: "indicatorGrid" }, [indicator("현재 RSI", "31.2"), indicator("과열 기준", "70"), indicator("관찰 기준", "30")]),
  ]);
}

function SentimentBlock() {
  return h("article", { className: "analysisCard sentimentBlock" }, [h("span", null, "시장 심리 온도계"), h("div", null, [h("strong", null, "공포"), h("b", null, "24°C")]), h("i", null)]);
}

function SmartMoneyBlock() {
  return h("article", { className: "analysisCard smartBlock" }, [h("span", null, "스마트 머니 추적"), h("div", { className: "smartGrid" }, [h("strong", null, "45"), h("p", null, "자금 유입 우세"), h("em", null, "호가창 비율 1.45")])]);
}

function WatchlistBlock({ watchlist, actions, setModal }) {
  return h("article", { className: "analysisCard" }, [h(SectionHead, { title: "관심 종목", desc: "목표가와 알림 상태", action: h("button", { className: "smallBtn", onClick: actions.addWatchlist }, "+") }), ...watchlist.map((item) => h("button", { className: "watchRow", key: item.id, onClick: () => actions.toggleWatch(item.id) }, [h("strong", null, item.symbol), h("span", null, item.label), h("em", { className: item.active ? "state on" : "state" }, item.active ? "ON" : "OFF")]))]);
}

function WhaleSignals() {
  return h("div", { className: "whalePanel" }, [
    h("div", { className: "whaleStats" }, [indicator("자금 순유입", "+₩285억"), indicator("대량 유입 건수", "8건"), indicator("대량 유출 건수", "5건")]),
    [["↑", "유입", "₩852억 (0.656 BTC) · Upbit", "2분 전", "green"], ["↓", "유출", "₩518억 (0.399 BTC) · Upbit", "15분 전", "red"], ["↑", "유입", "₩1480억 (1.139 BTC) · Upbit", "22분 전", "green"]].map((item) => h("div", { className: `whaleRow ${item[4]}`, key: item.join("-") }, [h("strong", null, `${item[0]} ${item[1]}`), h("span", null, item[2]), h("small", null, item[3])]))
  ]);
}

function DrawingList({ drawings, setModal }) {
  return h("div", { className: "drawingList" }, drawings.map((item) => h("button", { className: "drawingRow", key: item.id, onClick: () => setModal({ type: "drawingDetail", item }) }, [h("span", { className: "drawIcon" }, "📊"), h("span", null, [h("strong", null, item.title), h("small", null, `${item.subtitle} · ${new Date(item.createdAt).toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit" })}`)]), h("em", null, item.tag), h("small", null, `♥ ${item.likes}  ◉ ${item.views}`)])));
}

function Modal({ modal, selected, actions, setModal }) {
  return h("div", { className: "modalBackdrop", onClick: () => setModal(null) }, h("section", { className: "modal", onClick: (event) => event.stopPropagation() }, [
    h("button", { className: "closeBtn", onClick: () => setModal(null) }, "×"),
    renderModal(modal, selected, actions, setModal),
  ]));
}

function renderModal(modal, selected, actions, setModal) {
  if (modal.type === "assetDetail") return h(AssetDetailModal, { asset: modal.asset ?? selected, actions });
  if (modal.type === "strategyCreate") return h(FormModal, { title: "전략 추가", desc: "조건, 자산, 알림 방식을 설정합니다.", fields: [["전략명", `${selected.symbol} 변동성 전략`], ["조건", "RSI 30 이하"], ["실행 방식", "알림"]], onSave: actions.addStrategy });
  if (modal.type === "strategyDetail") return h(StrategyModal, { item: modal.item, actions });
  if (modal.type === "triggerDetail") return h(DetailModal, { title: modal.item.title, desc: "트리거 감지 기록 상세", rows: modal.item });
  if (modal.type === "alertCreate") return h(FormModal, { title: "알림 만들기", desc: "가격, 리스크, 뉴스, 전략 조건 알림을 설정합니다.", fields: [["자산", selected.symbol], ["조건", "변동률 3% 이상"], ["채널", "in-app / push"]], onSave: actions.addAlert });
  if (modal.type === "holdingRecord") return h(FormModal, { title: "보유 기록 추가", desc: "직접 주문 기능이 아니라 포트폴리오 보유 수량과 메모를 기록합니다.", fields: [["자산", selected.symbol], ["수량 변화", "0.01"], ["평균 단가", format(selected.currentPrice)], ["메모", "보유 기록 업데이트"]], onSave: actions.addHoldingRecord });
  if (modal.type === "holdingDetail") return h(DetailModal, { title: `${modal.item.symbol} 보유 상세`, desc: "수량, 평균 단가, 현재가, 손익률", rows: modal.item });
  if (modal.type === "insightDetail") return h(DetailModal, { title: modal.item.title, desc: modal.item.summary, rows: modal.item, action: h("button", { className: "primaryBtn wide", onClick: actions.addInsight }, "액션 후보 생성") });
  if (modal.type === "drawingDetail") return h(DetailModal, { title: modal.item.title, desc: modal.item.subtitle, rows: modal.item, action: h("button", { className: "primaryBtn wide", onClick: actions.addDrawing }, "드로잉 복제") });
  return h(DetailModal, { title: "상세", desc: "기능 상세", rows: modal });
}

function AssetDetailModal({ asset, actions }) {
  return h("div", null, [h("h2", null, `${asset.koreanName} 상세보기`), h("p", null, "가격, 차트, 기술 지표, 관심종목, 알림, 드로잉 진입을 한 화면에 모읍니다."), h("div", { className: "modalGrid" }, [detail("현재가", `${format(asset.currentPrice)}원`), detail("변동률", `${asset.change24h > 0 ? "+" : ""}${asset.change24h}%`), detail("고가", `${format(asset.high24h)}원`), detail("저가", `${format(asset.low24h)}원`), detail("거래대금", `${Math.round(asset.tradeValue24h / 100000000)}억`), detail("업데이트", new Date(asset.priceUpdatedAt).toLocaleTimeString("ko-KR"))]), h(TradingChart, { selected: asset, large: false }), h("div", { className: "modalActions" }, [h("button", { className: "primaryBtn", onClick: actions.addWatchlist }, "관심종목 추가"), h("button", { className: "ghostBtn", onClick: actions.addAlert }, "알림 만들기"), h("button", { className: "ghostBtn", onClick: actions.addDrawing }, "드로잉 저장")])]);
}

function StrategyModal({ item, actions }) {
  return h("div", null, [h("h2", null, item.title), h("p", null, item.condition), h("div", { className: "modalGrid" }, [detail("자산", item.symbol), detail("실행", item.action), detail("상태", item.active ? "ON" : "OFF"), detail("설명", "조건 충족 시 알림과 트리거 기록 생성")]), h("div", { className: "modalActions" }, [h("button", { className: "primaryBtn", onClick: () => actions.runStrategy(item.id) }, "지금 실행"), h("button", { className: "ghostBtn", onClick: () => actions.toggleStrategy(item.id) }, "ON/OFF 전환")])]);
}

function FormModal({ title, desc, fields, onSave }) {
  return h("div", null, [h("h2", null, title), h("p", null, desc), h("div", { className: "formGrid" }, fields.map(([label, value]) => h("label", { className: "field", key: label }, [h("span", null, label), h("input", { defaultValue: value })]))), h("button", { className: "primaryBtn wide", onClick: onSave }, "저장")]);
}

function DetailModal({ title, desc, rows, action }) {
  return h("div", null, [h("h2", null, title), h("p", null, desc), h("div", { className: "modalGrid" }, Object.entries(rows).map(([key, value]) => detail(key, typeof value === "object" ? JSON.stringify(value) : value))), action]);
}

function perf(label, value, width, tone) {
  return h("div", { className: `perf ${tone}` }, [h("span", null, label), h("strong", null, value), h("i", { style: { width: `${width}%` } })]);
}

function indicator(label, value) {
  return h("div", { className: "indicator" }, [h("span", null, label), h("strong", null, value)]);
}

function detail(label, value) {
  return h("div", { className: "detail" }, [h("span", null, label), h("strong", null, String(value))]);
}

function iconFor(icon) {
  return { spark: "✦", flow: "▣", btc: "₿", eth: "◆", sol: "≋", risk: "⚠" }[icon] ?? "•";
}

function candle(price) {
  return { timestamp: now(), open: Math.round(price * 0.997), high: Math.round(price * 1.004), low: Math.round(price * 0.995), close: price, volume: Number((Math.random() * 30 + 4).toFixed(2)) };
}

function buildContracts(data) {
  const envelope = (dataValue) => ({ success: true, message: "success", data: dataValue });
  return {
    marketOverview: { method: "GET", path: "/api/investment/market/overview", response: envelope({ items: data.markets, pagination: { page: 1, limit: 20, total: data.markets.length, totalPages: 1 } }) },
    marketDetail: { method: "GET", path: "/api/investment/market/:symbol", response: envelope({ item: data.markets[0], indicators: { rsi: 31.2, ma20: 130240000, ma50: 127880000 }, drawings: data.drawings }) },
    watchlist: { method: "GET/POST/DELETE", path: "/api/watchlist", response: envelope({ items: data.watchlist }) },
    portfolio: { method: "GET/POST/PATCH/DELETE", path: "/api/portfolio", response: envelope({ holdings: data.holdings }) },
    intelligence: { method: "GET", path: "/api/market-intelligence/:symbol/dashboard", response: envelope({ insights: data.insights, sentiment: { score: 24, label: "fear" }, smartMoney: { score: 45 } }) },
    notifications: { method: "GET/POST/PATCH", path: "/api/notifications", response: envelope({ items: data.alerts }) },
    playbooks: { method: "GET/POST/PATCH", path: "/api/playbooks", response: envelope({ items: data.strategies, triggers: data.triggers }) },
    feed: { method: "GET", path: "/api/feed", response: envelope({ items: [...data.insights, ...data.news] }) },
    news: { method: "GET/POST", path: "/api/news/bookmarks", response: envelope({ items: data.news }) },
    drawings: { method: "GET/POST/PATCH/DELETE", path: "/api/chart-drawings", response: envelope({ items: data.drawings }) },
  };
}

function format(value) {
  return new Intl.NumberFormat("ko-KR").format(Math.round(Number(value) || 0));
}

function formatShort(value) {
  return `${Math.round(Number(value) / 10000)}만`;
}

function rateClass(value) {
  if (value > 0) return "rate up";
  if (value < 0) return "rate down";
  return "rate";
}

createRoot(document.getElementById("root")).render(h(App));
