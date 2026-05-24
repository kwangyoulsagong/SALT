import { useEffect, useMemo, useRef, useState } from "react";
import {
  Activity,
  AlertTriangle,
  ArrowLeft,
  BarChart3,
  Bell,
  Bookmark,
  BrainCircuit,
  CheckCircle2,
  Crosshair,
  Fish,
  Flag,
  Heart,
  LineChart,
  ListChecks,
  Newspaper,
  Radar,
  Search,
  ShieldCheck,
  Sparkles,
  Star,
  Target,
  TrendingUp,
  WalletCards,
  Waves,
  Zap,
} from "lucide-react";
import {
  CandlestickSeries,
  ColorType,
  HistogramSeries,
  LineStyle,
  createChart,
} from "lightweight-charts";

const nowIso = () => new Date().toISOString();

/* ====== Seed data ====== */
const assetsSeed = [
  asset("BTC", "비트코인", "Bitcoin", 129913000, -1.55, 133238000, 129345000, 350100000000, "hold", 82),
  asset("ETH", "이더리움", "Ethereum", 4230000, 0.75, 4358000, 4184000, 54450000000, "collect", 76),
  asset("SOL", "솔라나", "Solana", 287300, 3.42, 292100, 274000, 19600000000, "scalp", 88),
  asset("XRP", "리플", "Ripple", 1870, 1.32, 1930, 1760, 11800000000, "wait", 61),
  asset("ADA", "에이다", "Cardano", 1180, -0.64, 1215, 1120, 8200000000, "collect", 69),
  asset("AVAX", "아발란체", "Avalanche", 56200, 6.14, 57100, 51400, 7100000000, "scalp", 84),
  asset("LINK", "체인링크", "Chainlink", 24800, -0.52, 25400, 24100, 4300000000, "wait", 58),
  asset("DOGE", "도지코인", "Dogecoin", 312, 2.21, 327, 301, 12200000000, "scalp", 71),
  asset("MATIC", "폴리곤", "Polygon", 1320, -2.12, 1380, 1284, 3900000000, "wait", 54),
  asset("DOT", "폴카닷", "Polkadot", 6850, 0.91, 7020, 6720, 3500000000, "collect", 67),
];

const holdingsSeed = [
  { symbol: "BTC", name: "비트코인", quantity: 0.0245, averagePrice: 98000000, currentPrice: 129913000, weight: 58, profitRate: 32.56 },
  { symbol: "ETH", name: "이더리움", quantity: 1.52, averagePrice: 3850000, currentPrice: 4230000, weight: 20, profitRate: 9.87 },
  { symbol: "SOL", name: "솔라나", quantity: 12.5, averagePrice: 245000, currentPrice: 287300, weight: 14, profitRate: 17.27 },
  { symbol: "XRP", name: "리플", quantity: 5200, averagePrice: 1650, currentPrice: 1870, weight: 8, profitRate: 13.33 },
];

const feedSeed = [
  { id: "feed-1", type: "ai", symbol: "BTC", title: "BTC 결정 변경", body: "관망에서 분할 관찰로 바뀌었어요.", time: "2분 전", severity: "high" },
  { id: "feed-2", type: "risk", symbol: "SOL", title: "손절 기준 미설정", body: "SOL 단타 계획에 최대 손실 금액이 필요해요.", time: "8분 전", severity: "warn" },
  { id: "feed-3", type: "news", symbol: "BTC", title: "기관 BTC 옵션 포지션 증가", body: "뉴스 분위기 긍정, 단기 변동성 높음.", time: "16분 전", severity: "info" },
  { id: "feed-4", type: "behavior", symbol: "—", title: "추격 진입 패턴", body: "최근 7일 중 3회가 급등 10분 이내 진입.", time: "오늘", severity: "warn" },
];

const alertsSeed = [
  { id: "alert-1", title: "SOL 단타 조건 충족", body: "거래량 증가 + 저항 돌파 시도", unread: true, channel: "in-app", time: "방금 전" },
  { id: "alert-2", title: "BTC 장기 모으기 구간 접근", body: "변동성 안정 + 20일선 회복", unread: true, channel: "push", time: "5분 전" },
  { id: "alert-3", title: "포트폴리오 BTC 비중 58%", body: "집중도 점검이 필요해요", unread: false, channel: "in-app", time: "1시간 전" },
];

const newsSeed = [
  { id: "news-1", symbol: "BTC", title: "기관 옵션 포지션이 100K 상단에 집중", summary: "옵션 시장 데이터 분석", sentiment: "positive", source: "Bloomberg", views: 12400, time: "12분 전" },
  { id: "news-2", symbol: "ETH", title: "Ethereum 수수료 압력 완화", summary: "L2 솔루션 활용도 증가", sentiment: "neutral", source: "Decrypt", views: 8200, time: "32분 전" },
  { id: "news-3", symbol: "SOL", title: "Solana DEX 거래량 확대", summary: "주간 거래량 28% 증가", sentiment: "positive", source: "CoinDesk", views: 6800, time: "1시간 전" },
  { id: "news-4", symbol: "BTC", title: "고래 지갑 1주일새 +4,200 BTC 순매수", summary: "기관성 자금 유입 추정", sentiment: "positive", source: "Whale Alert", views: 22100, time: "2시간 전" },
  { id: "news-5", symbol: "XRP", title: "SEC 추가 소송 가능성에 변동성 확대", summary: "법적 리스크 확대", sentiment: "negative", source: "Reuters", views: 5600, time: "3시간 전" },
  { id: "news-6", symbol: "AVAX", title: "Avalanche 기관 파트너십 확정", summary: "B2B 인프라 채택", sentiment: "positive", source: "TheBlock", views: 4900, time: "오늘" },
];

const whaleTransactions = [
  { id: "w-1", symbol: "BTC", direction: "buy", amountKRW: 21800000000, exchange: "Binance", detectedAt: "방금 전" },
  { id: "w-2", symbol: "ETH", direction: "buy", amountKRW: 8400000000, exchange: "Coinbase", detectedAt: "6분 전" },
  { id: "w-3", symbol: "SOL", direction: "sell", amountKRW: 3200000000, exchange: "Upbit", detectedAt: "14분 전" },
  { id: "w-4", symbol: "BTC", direction: "buy", amountKRW: 6100000000, exchange: "Kraken", detectedAt: "32분 전" },
];

const sortOptions = [
  ["volume", "거래대금"],
  ["change", "변동률"],
  ["price", "가격"],
  ["name", "이름"],
];

const orderOptions = [
  ["desc", "내림차순"],
  ["asc", "오름차순"],
];

const periodOptions = [
  ["live", "실시간"],
  ["1d", "1일"],
  ["1w", "1주일"],
  ["1m", "1개월"],
  ["3m", "3개월"],
];

const timeframeOptions = [
  ["1m", "1분"],
  ["5m", "5분"],
  ["15m", "15분"],
  ["1h", "1시간"],
  ["1d", "1일"],
  ["1w", "1주"],
];

const tabs = [
  ["realtime", "실시간 시장"],
  ["portfolio", "포트폴리오"],
  ["watchlist", "관심 종목"],
  ["alerts", "알림"],
];

function asset(symbol, koreanName, englishName, currentPrice, change24h, high24h, low24h, tradeValue24h, action, confidence) {
  return {
    symbol,
    market: `KRW-${symbol}`,
    koreanName,
    englishName,
    currentPrice,
    change24h,
    high24h,
    low24h,
    tradeValue24h,
    action,
    confidence,
    priceUpdatedAt: nowIso(),
  };
}

/* ============================================================
   Root
============================================================ */
export default function App() {
  const [activeTab, setActiveTab] = useState("realtime");
  const [view, setView] = useState("list"); // "list" | "detail"
  const [selectedSymbol, setSelectedSymbol] = useState("BTC");
  const [mode, setMode] = useState("scalp");
  const [markets, setMarkets] = useState(assetsSeed);
  const [holdings, setHoldings] = useState(holdingsSeed);
  const [alerts, setAlerts] = useState(alertsSeed);
  const [news, setNews] = useState(newsSeed);
  const [bookmarkedNewsIds, setBookmarkedNewsIds] = useState(["news-1"]);
  const [watchlist, setWatchlist] = useState(["BTC", "SOL", "ETH"]);
  const [blinkingSymbol, setBlinkingSymbol] = useState(null);
  const [filter, setFilter] = useState({ sort: "volume", order: "desc", period: "live" });
  const [searchQuery, setSearchQuery] = useState("");
  const [timeframe, setTimeframe] = useState("5m");
  const [modal, setModal] = useState(null);

  const selected = useMemo(
    () => markets.find((item) => item.symbol === selectedSymbol) ?? markets[0],
    [markets, selectedSymbol]
  );

  const coach = useMemo(() => makeCoach(selected, holdings, mode), [selected, holdings, mode]);
  const intel = useMemo(() => makeIntelligence(selected, news), [selected, news]);
  const buyZones = useMemo(() => makeBuyZones(selected, mode), [selected, mode]);
  const portfolioSummary = useMemo(() => summarizePortfolio(holdings), [holdings]);

  /* Realtime price tick simulation */
  useEffect(() => {
    const id = setInterval(() => {
      setMarkets((prev) => {
        const target = prev[Math.floor(Math.random() * prev.length)];
        const drift = 1 + (Math.random() - 0.48) / 220;
        const next = prev.map((item) => {
          if (item.symbol !== target.symbol) return item;
          return {
            ...item,
            currentPrice: Math.round(item.currentPrice * drift),
            change24h: Number((item.change24h + (Math.random() - 0.5) * 0.08).toFixed(2)),
            priceUpdatedAt: nowIso(),
          };
        });
        setBlinkingSymbol(target.symbol);
        setTimeout(() => setBlinkingSymbol((current) => (current === target.symbol ? null : current)), 800);
        return next;
      });
    }, 1600);
    return () => clearInterval(id);
  }, []);

  function openDetail(symbol) {
    setSelectedSymbol(symbol);
    setView("detail");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function backToList() {
    setView("list");
  }

  function toggleWatch(symbol) {
    setWatchlist((prev) => (prev.includes(symbol) ? prev.filter((item) => item !== symbol) : [symbol, ...prev]));
  }

  function toggleBookmark(id) {
    setBookmarkedNewsIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [id, ...prev]));
  }

  function addAlert(custom) {
    setAlerts((prev) => [
      {
        id: `alert-${Date.now()}`,
        title: custom?.title ?? `${selected.symbol} ${modeLabel(mode)} 조건 알림`,
        body: custom?.body ?? coach.decision.summary,
        unread: true,
        channel: custom?.channel ?? "in-app",
        time: "방금 전",
      },
      ...prev,
    ]);
    setModal(null);
  }

  function addHolding(record) {
    setHoldings((prev) => {
      const existing = prev.find((item) => item.symbol === record.symbol);
      if (!existing) {
        return [
          ...prev,
          {
            symbol: record.symbol,
            name: record.symbol,
            quantity: Number(record.quantity || 0),
            averagePrice: Number(record.averagePrice || selected.currentPrice),
            currentPrice: selected.currentPrice,
            weight: 5,
            profitRate: 0,
          },
        ];
      }
      return prev.map((item) =>
        item.symbol === record.symbol
          ? {
              ...item,
              quantity: Number((item.quantity + Number(record.quantity || 0)).toFixed(6)),
              currentPrice: selected.currentPrice,
            }
          : item
      );
    });
    setModal(null);
  }

  const unreadCount = alerts.filter((item) => item.unread).length;

  return (
    <main className="appShell">
      <PageHeader unreadCount={unreadCount} />

      <nav className="mainTabs">
        {tabs.map(([value, label]) => (
          <button
            key={value}
            className={activeTab === value ? "active" : ""}
            onClick={() => {
              setActiveTab(value);
              setView("list");
            }}
          >
            {label}
            {value === "alerts" && unreadCount > 0 && <span className="badgeCount">{unreadCount}</span>}
          </button>
        ))}
      </nav>

      {activeTab === "realtime" && view === "list" && (
        <RealtimeView
          markets={markets}
          selected={selected}
          selectedSymbol={selectedSymbol}
          setSelectedSymbol={setSelectedSymbol}
          openDetail={openDetail}
          watchlist={watchlist}
          toggleWatch={toggleWatch}
          coach={coach}
          intel={intel}
          buyZones={buyZones}
          news={news.filter((item) => item.symbol === selected.symbol).slice(0, 3)}
          mode={mode}
          setMode={setMode}
          blinkingSymbol={blinkingSymbol}
          filter={filter}
          setFilter={setFilter}
          searchQuery={searchQuery}
          setSearchQuery={setSearchQuery}
        />
      )}

      {activeTab === "watchlist" && view === "list" && (
        <WatchlistView
          markets={markets}
          watchlist={watchlist}
          toggleWatch={toggleWatch}
          openDetail={openDetail}
          blinkingSymbol={blinkingSymbol}
          coach={coach}
          intel={intel}
          buyZones={buyZones}
          selected={selected}
          mode={mode}
          setMode={setMode}
        />
      )}

      {(activeTab === "realtime" || activeTab === "watchlist") && view === "detail" && (
        <DetailView
          selected={selected}
          coach={coach}
          intel={intel}
          buyZones={buyZones}
          news={news}
          mode={mode}
          setMode={setMode}
          timeframe={timeframe}
          setTimeframe={setTimeframe}
          backToList={backToList}
          toggleWatch={toggleWatch}
          watchlist={watchlist}
          bookmarkedNewsIds={bookmarkedNewsIds}
          toggleBookmark={toggleBookmark}
          setModal={setModal}
          addAlert={addAlert}
        />
      )}

      {activeTab === "portfolio" && (
        <PortfolioView
          portfolioSummary={portfolioSummary}
          holdings={holdings}
          setModal={setModal}
          openDetail={(symbol) => {
            setActiveTab("realtime");
            openDetail(symbol);
          }}
        />
      )}

      {activeTab === "alerts" && (
        <AlertsView
          alerts={alerts}
          setAlerts={setAlerts}
          news={news}
          bookmarkedNewsIds={bookmarkedNewsIds}
          toggleBookmark={toggleBookmark}
          addAlert={addAlert}
          setModal={setModal}
        />
      )}

      {modal && (
        <PrototypeModal
          modal={modal}
          selected={selected}
          coach={coach}
          close={() => setModal(null)}
          addHolding={addHolding}
          addAlert={addAlert}
        />
      )}
    </main>
  );
}

/* ============================================================
   Page header
============================================================ */
function PageHeader({ unreadCount }) {
  return (
    <header className="pageHeader">
      <div className="serviceIcon">
        <BarChart3 size={22} />
      </div>
      <div>
        <h1>투자 분석</h1>
        <p>실시간 시장 · AI 코치 · 포트폴리오를 한 화면에서</p>
      </div>
      <div className="headerSpacer" />
      <span className="liveBadge">
        <span className="dot" />
        실시간 · 오늘 19:30 기준
      </span>
      <button className="btnIcon" aria-label="검색">
        <Search size={18} />
      </button>
      <button className="btnIcon" aria-label="알림" style={{ position: "relative" }}>
        <Bell size={18} />
        {unreadCount > 0 && (
          <span
            style={{
              position: "absolute",
              top: 4,
              right: 4,
              width: 8,
              height: 8,
              borderRadius: "50%",
              background: "var(--up)",
            }}
          />
        )}
      </button>
    </header>
  );
}

/* ============================================================
   Realtime view (default)
============================================================ */
function RealtimeView({
  markets,
  selected,
  selectedSymbol,
  setSelectedSymbol,
  openDetail,
  watchlist,
  toggleWatch,
  coach,
  intel,
  buyZones,
  news,
  mode,
  setMode,
  blinkingSymbol,
  filter,
  setFilter,
  searchQuery,
  setSearchQuery,
}) {
  const sorted = useMemo(() => sortMarkets(markets, filter, searchQuery), [markets, filter, searchQuery]);

  return (
    <section className="realtimeLayout">
      <div>
        <div className="toolbar">
          <div className="filterTabsGroup">
            <div className="filterTabs">
              {sortOptions.map(([value, label]) => (
                <button
                  key={value}
                  className={filter.sort === value ? "active" : ""}
                  onClick={() => setFilter({ ...filter, sort: value })}
                >
                  {label}
                </button>
              ))}
            </div>
            <div className="filterTabs">
              {orderOptions.map(([value, label]) => (
                <button
                  key={value}
                  className={filter.order === value ? "active" : ""}
                  onClick={() => setFilter({ ...filter, order: value })}
                >
                  {label}
                </button>
              ))}
            </div>
            <div className="filterTabs">
              {periodOptions.map(([value, label]) => (
                <button
                  key={value}
                  className={filter.period === value ? "active" : ""}
                  onClick={() => setFilter({ ...filter, period: value })}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
          <span className="status">
            <span className="dot" />
            실시간 가격 반영 중
          </span>
        </div>

        <div className="tableWrap">
          <div className="scrollTable">
            <div className="marketRow head">
              <span>자산</span>
              <span>현재가</span>
              <span>변동률</span>
              <span>최고가</span>
              <span>최저가</span>
              <span>거래대금</span>
              <span>AI 판단</span>
            </div>
            {sorted.length === 0 && <div className="empty">검색 결과가 없어요</div>}
            {sorted.map((item) => (
              <button
                key={item.symbol}
                className={item.symbol === selectedSymbol ? "marketRow selected" : "marketRow"}
                onMouseEnter={() => setSelectedSymbol(item.symbol)}
                onClick={() => openDetail(item.symbol)}
              >
                <span className="assetCell">
                  <Coin symbol={item.symbol} />
                  <span className="nameBlock">
                    <b>{item.koreanName}</b>
                    <small>{item.symbol}</small>
                  </span>
                </span>
                <span className="priceCell">{money(item.currentPrice)}원</span>
                <span>
                  <ChangeRate value={item.change24h} blink={blinkingSymbol === item.symbol} />
                </span>
                <span className="priceCell">{money(item.high24h)}원</span>
                <span className="priceCell">{money(item.low24h)}원</span>
                <span className="priceCell">{Math.round(item.tradeValue24h / 100000000)}억</span>
                <span>
                  <DecisionPill action={item.action} />
                </span>
              </button>
            ))}
          </div>
        </div>
      </div>

      <aside className="sidebar">
        <SidebarHeader selected={selected} watchlist={watchlist} toggleWatch={toggleWatch} blink={blinkingSymbol === selected.symbol} />
        <div className="chartCard">
          <div className="chartHead">
            <h3>실시간 차트 (5분 봉)</h3>
            <span className="tag brand">스마트 바이존 ON</span>
          </div>
          <TradingChart symbol={selected.symbol} price={selected.currentPrice} compact zones={buyZones.zones} />
          <ZoneLegend />
        </div>
        <AICoachPanel coach={coach} intel={intel} buyZones={buyZones} news={news} mode={mode} setMode={setMode} onDeepDive={() => openDetail(selected.symbol)} />
      </aside>
    </section>
  );
}

/* ============================================================
   Watchlist view — same list pattern, filtered
============================================================ */
function WatchlistView({ markets, watchlist, toggleWatch, openDetail, blinkingSymbol, coach, intel, buyZones, selected, mode, setMode }) {
  const filtered = markets.filter((item) => watchlist.includes(item.symbol));
  return (
    <section className="realtimeLayout">
      <div>
        <div className="toolbar">
          <div className="filterTabsGroup">
            <span className="label">관심 종목 {watchlist.length}개</span>
          </div>
          <span className="status">
            <Heart size={12} style={{ color: "var(--up)" }} />
            관심 등록한 자산만 표시
          </span>
        </div>
        <div className="tableWrap">
          <div className="scrollTable">
            <div className="marketRow head">
              <span>자산</span>
              <span>현재가</span>
              <span>변동률</span>
              <span>최고가</span>
              <span>최저가</span>
              <span>거래대금</span>
              <span>관심</span>
            </div>
            {filtered.length === 0 && <div className="empty">관심 종목이 없어요. 실시간 시장에서 별표를 눌러 추가해보세요.</div>}
            {filtered.map((item) => (
              <div
                key={item.symbol}
                className="marketRow"
                onClick={() => openDetail(item.symbol)}
                style={{ cursor: "pointer" }}
              >
                <span className="assetCell">
                  <Coin symbol={item.symbol} />
                  <span className="nameBlock">
                    <b>{item.koreanName}</b>
                    <small>{item.symbol}</small>
                  </span>
                </span>
                <span className="priceCell">{money(item.currentPrice)}원</span>
                <span><ChangeRate value={item.change24h} blink={blinkingSymbol === item.symbol} /></span>
                <span className="priceCell">{money(item.high24h)}원</span>
                <span className="priceCell">{money(item.low24h)}원</span>
                <span className="priceCell">{Math.round(item.tradeValue24h / 100000000)}억</span>
                <span>
                  <button
                    className="btnIcon"
                    style={{ width: 32, height: 32, color: "var(--up)" }}
                    onClick={(event) => {
                      event.stopPropagation();
                      toggleWatch(item.symbol);
                    }}
                    aria-label="관심 해제"
                  >
                    <Heart size={14} fill="currentColor" />
                  </button>
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
      <aside className="sidebar">
        <SidebarHeader selected={selected} watchlist={watchlist} toggleWatch={toggleWatch} />
        <div className="chartCard">
          <div className="chartHead">
            <h3>실시간 차트 (5분 봉)</h3>
            <span className="tag brand">스마트 바이존 ON</span>
          </div>
          <TradingChart symbol={selected.symbol} price={selected.currentPrice} compact zones={buyZones.zones} />
          <ZoneLegend />
        </div>
        <AICoachPanel coach={coach} intel={intel} buyZones={buyZones} news={[]} mode={mode} setMode={setMode} onDeepDive={() => openDetail(selected.symbol)} />
      </aside>
    </section>
  );
}

/* ============================================================
   Sidebar — preview header + chart + AI coach
============================================================ */
function SidebarHeader({ selected, watchlist, toggleWatch, blink }) {
  return (
    <div className="previewHeader">
      <Coin symbol={selected.symbol} large />
      <div className="nameBlock">
        <b>{selected.koreanName}</b>
        <small>{selected.symbol} · {selected.englishName}</small>
      </div>
      <div className="priceBlock">
        <strong>{money(selected.currentPrice)}원</strong>
        <ChangeRate value={selected.change24h} blink={blink} />
      </div>
      <button
        className="btnIcon"
        aria-label="관심 토글"
        onClick={() => toggleWatch(selected.symbol)}
        style={{ color: watchlist.includes(selected.symbol) ? "var(--up)" : "var(--muted)" }}
      >
        <Heart size={16} fill={watchlist.includes(selected.symbol) ? "currentColor" : "none"} />
      </button>
    </div>
  );
}

function AICoachPanel({ coach, intel, buyZones, news, mode, setMode, onDeepDive }) {
  return (
    <div className="aiCoachCard">
      <div className="aiHead">
        <h3>
          <span className="aiIcon"><BrainCircuit size={14} /></span>
          AI 투자 코치
        </h3>
        <ModeSwitch mode={mode} setMode={setMode} />
      </div>

      <div className="aiSection">
        <div className="secTitle"><span className="dot" /> 지금의 판단</div>
        <DecisionCard coach={coach} compact />
      </div>

      <div className="aiSection">
        <div className="secTitle"><span className="dot" /> 스마트 바이존</div>
        <BuyZoneSummary buyZones={buyZones} mode={mode} compact />
      </div>

      <div className="aiSection">
        <div className="secTitle"><span className="dot" /> 시장 심리 온도계</div>
        <SentimentBlock intel={intel} />
      </div>

      <div className="aiSection">
        <div className="secTitle"><span className="dot" /> 스마트 머니 추적</div>
        <SmartMoneyBlock intel={intel} />
      </div>

      {news.length > 0 && (
        <div className="aiSection">
          <div className="secTitle"><span className="dot" /> 관련 뉴스</div>
          {news.map((item) => <NewsCompact key={item.id} item={item} />)}
        </div>
      )}

      <button className="btn primary wide" style={{ marginTop: 12 }} onClick={onDeepDive}>
        <Sparkles size={14} /> 상세 분석 페이지로 이동
      </button>
    </div>
  );
}

function useGeminiExplain({ selected, coach, mode, news }) {
  const [state, setState] = useState({ loading: false, error: null, data: null });
  const lastKeyRef = useRef(null);

  const trigger = useMemo(() => {
    return async () => {
      const key = `${selected.symbol}:${mode}:${selected.currentPrice}:${selected.change24h.toFixed(2)}`;
      if (lastKeyRef.current === key && state.data) return;
      lastKeyRef.current = key;
      setState({ loading: true, error: null, data: null });
      try {
        const response = await fetch("/api/ai-coach/explain", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            symbol: selected.symbol,
            koreanName: selected.koreanName,
            mode: mode === "scalp" ? "scalp" : "long_term",
            currentPrice: selected.currentPrice,
            change24h: selected.change24h,
            tradeValue24h: selected.tradeValue24h,
            confidence: coach.confidence,
            evidence: coach.evidence.map((item) => ({ label: item.label, value: String(item.value) })),
            news: news.slice(0, 5).map((item) => ({
              title: item.title,
              summary: item.summary,
              source: item.source,
              sentiment: item.sentiment,
            })),
          }),
        });
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const json = await response.json();
        if (!json.success) throw new Error(json.message ?? "응답 실패");
        setState({ loading: false, error: null, data: json.data });
      } catch (error) {
        setState({ loading: false, error: error.message ?? "호출 실패", data: null });
      }
    };
  }, [selected.symbol, selected.currentPrice, selected.change24h, mode, coach.confidence, news]);

  return { ...state, trigger };
}

function GeminiExplainCard({ selected, coach, mode, news }) {
  const explain = useGeminiExplain({ selected, coach, mode, news });
  const data = explain.data;
  const range = data?.expectedReturn;

  return (
    <div className="card lg">
      <div className="cardHead">
        <div>
          <h2>🤖 Gemini 해설</h2>
          <p>왜 {modeLabel(mode)}인지 · 예상 수익폭 · 뉴스 5줄 요약 (LLM 생성)</p>
        </div>
        <button className="btn primary" onClick={explain.trigger} disabled={explain.loading}>
          {explain.loading ? "생성 중…" : data ? "다시 생성" : "해설 생성"}
        </button>
      </div>

      {!data && !explain.loading && !explain.error && (
        <div className="empty">
          버튼을 눌러 Gemini가 이 종목·모드를 왜 그렇게 판단했는지 한국어 해설을 받아보세요.
        </div>
      )}

      {explain.loading && <div className="empty">Gemini가 해설을 만들고 있어요…</div>}

      {explain.error && (
        <div className="checkItem">
          <span className="iconWrap"><AlertTriangle size={16} /></span>
          <div>
            <b>해설 생성 실패</b>
            <span>{explain.error} · salt-server(:4000) 와 GEMINI_API_KEY 설정을 확인해주세요.</span>
          </div>
        </div>
      )}

      {data && (
        <div className="geminiExplain">
          {data.cached && (
            <span className="tag brand" style={{ marginBottom: 10, display: "inline-block" }}>5분 캐시 응답</span>
          )}

          <h3 className="explainTitle">왜 {modeLabel(mode)} 모드인지</h3>
          <p className="explainBody">{data.modeReasoning}</p>

          {range && (
            <div className="returnRange">
              <div className="rangeCell">
                <span>예상 수익 하단</span>
                <strong className={range.lowPercent < 0 ? "down" : "up"}>
                  {range.lowPercent > 0 ? "+" : ""}{range.lowPercent}%
                </strong>
              </div>
              <div className="rangeCell mid">
                <span>기대 시간</span>
                <strong>{range.timeframe}</strong>
              </div>
              <div className="rangeCell">
                <span>예상 수익 상단</span>
                <strong className="up">+{range.highPercent}%</strong>
              </div>
              <p className="rationale">{range.rationale}</p>
            </div>
          )}

          {data.keyDrivers?.length > 0 && (
            <>
              <h3 className="explainTitle">핵심 근거</h3>
              <ul className="explainList">
                {data.keyDrivers.map((line, index) => (
                  <li key={`driver-${index}`}>{line}</li>
                ))}
              </ul>
            </>
          )}

          {data.risks?.length > 0 && (
            <>
              <h3 className="explainTitle">주의해야 할 점</h3>
              <ul className="explainList warn">
                {data.risks.map((line, index) => (
                  <li key={`risk-${index}`}>{line}</li>
                ))}
              </ul>
            </>
          )}

          {data.newsSummary?.length > 0 && (
            <>
              <h3 className="explainTitle">관련 뉴스 5줄 요약</h3>
              <ol className="explainList numbered">
                {data.newsSummary.map((line, index) => (
                  <li key={`news-${index}`}>{line}</li>
                ))}
              </ol>
            </>
          )}

          <p className="explainDisclaimer">{data.disclaimer}</p>
        </div>
      )}
    </div>
  );
}

function ZoneLegend() {
  const items = [
    { color: "var(--brand)", label: "매수 적정가" },
    { color: "rgba(0, 122, 255, 0.55)", label: "매수존 상/하단", dashed: true },
    { color: "var(--down)", label: "손절선" },
    { color: "var(--up)", label: "분할 익절" },
  ];
  return (
    <div className="zoneLegend">
      {items.map((item) => (
        <span key={item.label} className="legendItem">
          <i
            className={item.dashed ? "swatch dashed" : "swatch"}
            style={{ background: item.dashed ? "transparent" : item.color, borderColor: item.color }}
          />
          {item.label}
        </span>
      ))}
    </div>
  );
}

function BuyZoneSummary({ buyZones, mode, compact }) {
  const { summary } = buyZones;
  const current = summary.currentPrice;
  const buyDelta = ((summary.buyCenter - current) / current) * 100;
  const stopDelta = ((summary.stop - current) / current) * 100;
  const tp1Delta = ((summary.tp1 - current) / current) * 100;
  const tp2Delta = ((summary.tp2 - current) / current) * 100;

  if (compact) {
    return (
      <div className="zoneSummaryCompact">
        <div className="zRow">
          <span className="zDot buy" />
          <span className="zLabel">매수존</span>
          <strong>{money(summary.buyLower)}원 ~ {money(summary.buyUpper)}원</strong>
          <em className="down">{signed(buyDelta.toFixed(1))}%</em>
        </div>
        <div className="zRow">
          <span className="zDot stop" />
          <span className="zLabel">손절선</span>
          <strong>{money(summary.stop)}원</strong>
          <em className="down">{signed(stopDelta.toFixed(1))}%</em>
        </div>
        <div className="zRow">
          <span className="zDot tp" />
          <span className="zLabel">1차 익절</span>
          <strong>{money(summary.tp1)}원</strong>
          <em className="up">{signed(tp1Delta.toFixed(1))}%</em>
        </div>
        <div className="zRow">
          <span className="zDot tp" />
          <span className="zLabel">2차 익절</span>
          <strong>{money(summary.tp2)}원</strong>
          <em className="up">{signed(tp2Delta.toFixed(1))}%</em>
        </div>
        <p className="zHint">
          {mode === "scalp" ? "단타" : "장기"} 기준 자동 산출 · 진입 시점에 코치가 재검증해요
        </p>
      </div>
    );
  }

  return (
    <div className="zoneSummary">
      <div className="zoneCell buy">
        <span>매수존 (적정 ± 0.4%)</span>
        <strong>{money(summary.buyLower)} ~ {money(summary.buyUpper)}</strong>
        <em className="down">{signed(buyDelta.toFixed(1))}%</em>
      </div>
      <div className="zoneCell stop">
        <span>손절선</span>
        <strong>{money(summary.stop)}원</strong>
        <em className="down">{signed(stopDelta.toFixed(1))}%</em>
      </div>
      <div className="zoneCell tp">
        <span>1차 익절 (30%)</span>
        <strong>{money(summary.tp1)}원</strong>
        <em className="up">{signed(tp1Delta.toFixed(1))}%</em>
      </div>
      <div className="zoneCell tp2">
        <span>2차 익절 (전량)</span>
        <strong>{money(summary.tp2)}원</strong>
        <em className="up">{signed(tp2Delta.toFixed(1))}%</em>
      </div>
    </div>
  );
}

function DecisionCard({ coach, compact }) {
  return (
    <div className="decisionCard">
      <div className="topRow">
        <DecisionPill action={coach.actionKey} />
        <span className="tag brand">{modeLabel(coach.mode)} 모드</span>
        <span className="tag">유효 {coach.mode === "scalp" ? "25분" : "30일"}</span>
      </div>
      <h4>{coach.decision.headline}</h4>
      {!compact && <p>{coach.decision.summary}</p>}
      <div className="confidenceMeter">
        <div className="meterHead">
          <span>판단 신뢰도</span>
          <strong>{coach.confidence}%</strong>
        </div>
        <div className="track"><i style={{ width: `${coach.confidence}%` }} /></div>
      </div>
    </div>
  );
}

function SentimentBlock({ intel }) {
  const value = intel.sentimentScore;
  return (
    <>
      <div className="sentimentRow">
        <div className="left">
          <span className="emoji">{intel.emoji}</span>
          <span className="titleText">{intel.sentimentLabel}</span>
        </div>
        <span className="tempNumber">{value}°</span>
      </div>
      <div className="sentimentBar">
        <i style={{ transform: `scaleX(${value / 100})` }} />
      </div>
      <p className="sentimentMsg">{intel.sentimentMessage}</p>
    </>
  );
}

function SmartMoneyBlock({ intel }) {
  const radius = 48;
  const circumference = 2 * Math.PI * radius;
  const arcLength = circumference * 0.79;
  const gap = circumference - arcLength;
  const score = intel.smartMoney.score;
  const filled = arcLength * (Math.abs(score) / 100);
  const color = score > 0 ? "var(--up)" : score < 0 ? "var(--down)" : "var(--neutral)";

  return (
    <>
      <div className="smartRow">
        <div className="smartCircle">
          <svg viewBox="0 0 104 104">
            <circle
              className="ringBg"
              cx="52"
              cy="52"
              r={radius}
              strokeDasharray={`${arcLength} ${gap}`}
            />
            <circle
              className="ringFg"
              cx="52"
              cy="52"
              r={radius}
              stroke={color}
              strokeDasharray={`${filled} ${circumference - filled}`}
            />
          </svg>
          <div className="score">{score > 0 ? `+${score}` : score}</div>
        </div>
        <div className="smartInfo">
          <h4>{intel.smartMoney.signal}</h4>
          <p>{intel.smartMoney.message}</p>
        </div>
      </div>
      <div className="smartGrid">
        <div className="cell">
          <span>대량 매수</span>
          <strong className="up">{intel.smartMoney.largeBuys}건</strong>
        </div>
        <div className="cell">
          <span>대량 매도</span>
          <strong className="down">{intel.smartMoney.largeSells}건</strong>
        </div>
        <div className="cell full">
          <span>호가창 매수/매도 비율</span>
          <strong>{intel.smartMoney.orderbookRatio}</strong>
        </div>
      </div>
    </>
  );
}

function NewsCompact({ item }) {
  return (
    <div className="newsItem">
      <div className={`thumb ${sentimentClass(item.sentiment)}`}>{item.symbol}</div>
      <div className="info">
        <h5>{item.title}</h5>
        <p>{item.summary}</p>
        <div className="meta">
          <span className="badge">{item.symbol}</span>
          <span>{item.source}</span>
          <span className="sep" />
          <span>{item.time}</span>
        </div>
      </div>
    </div>
  );
}

/* ============================================================
   Detail page
============================================================ */
function DetailView({
  selected,
  coach,
  intel,
  buyZones,
  news,
  mode,
  setMode,
  timeframe,
  setTimeframe,
  backToList,
  toggleWatch,
  watchlist,
  bookmarkedNewsIds,
  toggleBookmark,
  setModal,
  addAlert,
}) {
  const symbolNews = news.filter((item) => item.symbol === selected.symbol);
  const isWatched = watchlist.includes(selected.symbol);

  return (
    <section className="detailPage">
      <div className="detailHero">
        <div className="heroLeft">
          <button className="btnIcon" aria-label="목록으로" onClick={backToList}>
            <ArrowLeft size={18} />
          </button>
          <Coin symbol={selected.symbol} xl />
          <div className="nameBlock">
            <h2>{selected.koreanName}</h2>
            <small>{selected.symbol} · {selected.englishName} · {selected.market}</small>
          </div>
        </div>
        <div className="priceArea">
          <strong>{money(selected.currentPrice)}원</strong>
          <ChangeRate value={selected.change24h} />
        </div>
        <div className="heroActions">
          <button
            className={isWatched ? "btn soft" : "btn ghost"}
            onClick={() => toggleWatch(selected.symbol)}
          >
            <Heart size={14} fill={isWatched ? "currentColor" : "none"} />
            {isWatched ? "관심 해제" : "관심 추가"}
          </button>
          <button className="btn outline" onClick={() => addAlert()}>
            <Bell size={14} /> 알림 만들기
          </button>
          <button className="btn primary" onClick={() => setModal({ type: "preflight" })}>
            <ShieldCheck size={14} /> 주문 전 체크
          </button>
        </div>
      </div>

      <div className="detailGrid">
        <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
          {/* Chart */}
          <div className="card lg">
            <div className="cardHead">
              <div>
                <h2>실시간 차트 · 스마트 바이존</h2>
                <p>매수 적정 구간 · 손절 · 분할 익절 라인을 차트에 표시</p>
              </div>
              <div className="timeframeBar">
                {timeframeOptions.map(([value, label]) => (
                  <button
                    key={value}
                    className={timeframe === value ? "active" : ""}
                    onClick={() => setTimeframe(value)}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>
            <TradingChart symbol={selected.symbol} price={selected.currentPrice} large zones={buyZones.zones} />
            <ZoneLegend />
            <BuyZoneSummary buyZones={buyZones} mode={mode} />
            <div className="statGrid">
              <div className="statCell">
                <span>24시간 고가</span>
                <strong>{money(selected.high24h)}원</strong>
              </div>
              <div className="statCell">
                <span>24시간 저가</span>
                <strong>{money(selected.low24h)}원</strong>
              </div>
              <div className="statCell">
                <span>24시간 변동률</span>
                <strong className={rateTone(selected.change24h)}>{signed(selected.change24h)}%</strong>
              </div>
              <div className="statCell">
                <span>거래대금</span>
                <strong>{Math.round(selected.tradeValue24h / 100000000)}억원</strong>
              </div>
            </div>
          </div>

          {/* AI Coach detail */}
          <div className="card lg">
            <div className="cardHead">
              <div>
                <h2>AI 투자 코치</h2>
                <p>{modeLabel(mode)} 모드 판단 · 근거 · 위험 요소</p>
              </div>
              <ModeSwitch mode={mode} setMode={setMode} />
            </div>
            <DecisionCard coach={coach} />
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginTop: 16 }}>
              <div>
                <h3 style={{ fontSize: 13, fontWeight: 700, color: "var(--text)", marginBottom: 10 }}>판단 근거</h3>
                <div className="evidenceList">
                  {coach.evidence.map((item) => (
                    <div key={item.label} className="evidenceItem">
                      <span>{item.label}</span>
                      <strong className={item.tone}>{item.value}</strong>
                    </div>
                  ))}
                </div>
              </div>
              <div>
                <h3 style={{ fontSize: 13, fontWeight: 700, color: "var(--text)", marginBottom: 10 }}>위험 요소</h3>
                {coach.risks.map((item) => (
                  <div key={item.code} className="checkItem">
                    <span className="iconWrap"><AlertTriangle size={16} /></span>
                    <div>
                      <b>{item.label}</b>
                      <span>{item.body}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Gemini explain */}
          <GeminiExplainCard selected={selected} coach={coach} mode={mode} news={news.filter((item) => item.symbol === selected.symbol)} />


          {/* Profit plan */}
          <div className="card lg">
            <div className="cardHead">
              <div>
                <h2>수익 플랜</h2>
                <p>단계별 익절·손절·재진입 기준</p>
              </div>
            </div>
            <div className="planGrid">
              {coach.plan.map((item) => (
                <div key={item.label} className="planCard">
                  <span>{item.label}</span>
                  <strong className={item.tone}>{item.value}</strong>
                  <p>{item.copy}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Preflight */}
          <div className="card lg">
            <div className="cardHead">
              <div>
                <h2>주문 전 체크</h2>
                <p>진입가·손절가·익절가·금액으로 실시간 계산</p>
              </div>
              <span className="tag warn">orderExecution: false</span>
            </div>
            <PreflightForm selected={selected} addAlert={addAlert} />
          </div>

          {/* Behavior */}
          <div className="card lg">
            <div className="cardHead">
              <div>
                <h2>행동 가드</h2>
                <p>반복 행동 체크 + 실패 패턴 방지</p>
              </div>
            </div>
            {coach.behavior.map((item) => (
              <div key={item.title} className={item.passed ? "checkItem passed" : "checkItem"}>
                <span className="iconWrap">
                  {item.passed ? <CheckCircle2 size={16} /> : <AlertTriangle size={16} />}
                </span>
                <div>
                  <b>{item.title}</b>
                  <span>{item.body}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Right column */}
        <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
          {/* Intelligence */}
          <div className="aiCoachCard">
            <div className="aiHead">
              <h3>
                <span className="aiIcon"><Waves size={14} /></span>
                마켓 인텔리전스
              </h3>
            </div>
            <div className="aiSection">
              <div className="secTitle"><span className="dot" /> 시장 심리 온도계</div>
              <SentimentBlock intel={intel} />
            </div>
            <div className="aiSection">
              <div className="secTitle"><span className="dot" /> 스마트 머니 추적</div>
              <SmartMoneyBlock intel={intel} />
            </div>
          </div>

          {/* Whale */}
          <div className="card lg">
            <div className="cardHead">
              <div>
                <h2>고래 트랜잭션</h2>
                <p>최근 24시간 대규모 거래</p>
              </div>
            </div>
            {whaleTransactions.map((item) => (
              <div
                key={item.id}
                className="alertRow"
                style={{ background: "var(--bg-soft)" }}
              >
                <span className="iconWrap" style={{ background: item.direction === "buy" ? "var(--up-soft)" : "var(--down-soft)", color: item.direction === "buy" ? "var(--up)" : "var(--down)" }}>
                  <Fish size={16} />
                </span>
                <span>
                  <b>{item.symbol} · {Math.round(item.amountKRW / 100000000)}억 {item.direction === "buy" ? "매수" : "매도"}</b>
                  <span>{item.exchange}</span>
                </span>
                <em>{item.detectedAt}</em>
              </div>
            ))}
          </div>

          {/* News */}
          <div className="card lg">
            <div className="cardHead">
              <div>
                <h2>관련 뉴스</h2>
                <p>{symbolNews.length}건 · 클릭으로 북마크</p>
              </div>
            </div>
            {symbolNews.length === 0 && <div className="empty">이 자산 관련 뉴스가 없어요</div>}
            {symbolNews.map((item) => (
              <button
                key={item.id}
                className="newsItem"
                style={{ width: "100%", cursor: "pointer", background: "transparent", padding: "12px 0" }}
                onClick={() => toggleBookmark(item.id)}
              >
                <div className={`thumb ${sentimentClass(item.sentiment)}`}>{item.symbol}</div>
                <div className="info">
                  <h5>{item.title}</h5>
                  <p>{item.summary}</p>
                  <div className="meta">
                    <span className="badge">{sentimentLabel(item.sentiment)}</span>
                    <span>{item.source}</span>
                    <span className="sep" />
                    <span>{item.time}</span>
                    <span className="sep" />
                    <span style={{ color: bookmarkedNewsIds.includes(item.id) ? "var(--brand)" : "var(--light)", fontWeight: 700 }}>
                      <Bookmark size={11} fill={bookmarkedNewsIds.includes(item.id) ? "currentColor" : "none"} style={{ verticalAlign: "-1px", marginRight: 2 }} />
                      {bookmarkedNewsIds.includes(item.id) ? "저장됨" : "저장"}
                    </span>
                  </div>
                </div>
              </button>
            ))}
          </div>

          {/* Signal performance */}
          <div className="card lg">
            <div className="cardHead">
              <div>
                <h2>시그널 성과</h2>
                <p>최근 30일 검증</p>
              </div>
            </div>
            {coach.performance.map((item) => (
              <div key={item.label} style={{ marginTop: 12 }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                  <span style={{ fontSize: 12, fontWeight: 600, color: "var(--sub)" }}>{item.label}</span>
                  <strong style={{ fontSize: 13, fontWeight: 700, color: item.tone === "up" ? "var(--green)" : "var(--orange)" }}>{item.value}</strong>
                </div>
                <div style={{ height: 6, borderRadius: 999, background: "var(--bg-frame)", overflow: "hidden" }}>
                  <i
                    style={{
                      display: "block",
                      height: "100%",
                      width: `${item.width}%`,
                      background: item.tone === "up" ? "var(--green)" : "var(--orange)",
                      borderRadius: "inherit",
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

/* ============================================================
   Portfolio view
============================================================ */
function PortfolioView({ portfolioSummary, holdings, setModal, openDetail }) {
  return (
    <section className="portfolioGrid">
      <div className="portfolioHero">
        <div>
          <p className="eyebrow">My Portfolio</p>
          <h2>{money(portfolioSummary.total)}원</h2>
          <span className="rate">+{money(portfolioSummary.profit)}원 · +{portfolioSummary.profitRate.toFixed(2)}%</span>
        </div>
        <div className="stats">
          <div className="stat">
            <span>투자 원금</span>
            <strong>{money(portfolioSummary.invested)}원</strong>
          </div>
          <div className="stat">
            <span>보유 자산</span>
            <strong>{holdings.length}개</strong>
          </div>
          <div className="stat">
            <span>BTC 비중</span>
            <strong>{holdings.find((item) => item.symbol === "BTC")?.weight ?? 0}%</strong>
          </div>
          <div className="stat">
            <span>30일 수익률</span>
            <strong>+{portfolioSummary.profitRate.toFixed(1)}%</strong>
          </div>
        </div>
        <button className="btn primary" onClick={() => setModal({ type: "holding" })}>
          + 거래 기록 추가
        </button>
      </div>

      <article className="card lg curveCard" style={{ gridColumn: "1 / -1" }}>
        <div className="cardHead">
          <div>
            <h2>평가금 흐름</h2>
            <p>기간별 평가금액과 최대 낙폭</p>
          </div>
          <div className="filterTabs">
            {[["1w", "1주"], ["1m", "1개월"], ["3m", "3개월"], ["1y", "1년"]].map(([v, label]) => (
              <button key={v} className={v === "1m" ? "active" : ""}>{label}</button>
            ))}
          </div>
        </div>
        <svg className="curve" viewBox="0 0 900 240" preserveAspectRatio="none">
          {[0, 1, 2, 3].map((index) => (
            <line key={index} x1="30" x2="870" y1={42 + index * 48} y2={42 + index * 48} />
          ))}
          <polyline points="30,210 80,188 130,194 180,170 230,166 280,124 330,132 380,102 430,145 480,178 530,126 580,108 630,92 680,118 730,82 780,74 830,60 870,44" />
        </svg>
      </article>

      <article className="card lg">
        <div className="cardHead">
          <div>
            <h2>보유 자산</h2>
            <p>직접 기록 · 클릭하면 상세 분석</p>
          </div>
        </div>
        <div className="marketRow head" style={{ background: "transparent", borderBottom: "1px solid var(--line)", padding: "8px 8px" }}>
          <span>자산</span>
          <span></span>
          <span>비중</span>
          <span>평가가</span>
          <span>수익률</span>
        </div>
        {holdings.map((item) => (
          <button
            key={item.symbol}
            className="holdingRow"
            onClick={() => openDetail(item.symbol)}
          >
            <Coin symbol={item.symbol} />
            <span className="symbolGroup">
              <b>{item.name}</b>
              <small>{item.symbol} · {item.quantity}</small>
            </span>
            <span style={{ fontWeight: 600, color: "var(--sub)" }}>{item.weight}%</span>
            <span style={{ fontWeight: 600 }}>{money(item.currentPrice)}원</span>
            <ChangeRate value={item.profitRate} />
          </button>
        ))}
      </article>

      <article className="card lg">
        <div className="cardHead">
          <div>
            <h2>리스크 분석</h2>
            <p>집중도 · 변동성 · 낙폭 · 뉴스</p>
          </div>
        </div>
        <RiskRadar />
      </article>
    </section>
  );
}

function RiskRadar() {
  return (
    <div className="radar">
      <svg viewBox="0 0 200 200">
        <polygon className="gridLine" points="100,18 178,68 152,162 48,162 22,68" />
        <polygon className="gridInner" points="100,52 148,84 132,140 68,140 52,84" />
        <line className="axis" x1="100" y1="100" x2="100" y2="18" />
        <line className="axis" x1="100" y1="100" x2="178" y2="68" />
        <line className="axis" x1="100" y1="100" x2="152" y2="162" />
        <line className="axis" x1="100" y1="100" x2="48" y2="162" />
        <line className="axis" x1="100" y1="100" x2="22" y2="68" />
        <polygon className="shape" points="100,46 142,80 134,140 64,138 56,82" />
      </svg>
      <div className="stats">
        {[
          { label: "집중도", value: "58 / 60" },
          { label: "변동성", value: "42" },
          { label: "낙폭", value: "20" },
          { label: "뉴스 리스크", value: "31" },
          { label: "현금 비중", value: "12" },
        ].map((item) => (
          <div key={item.label} className="stat">
            <span>{item.label}</span>
            <strong>{item.value}</strong>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ============================================================
   Alerts view
============================================================ */
function AlertsView({ alerts, setAlerts, news, bookmarkedNewsIds, toggleBookmark, addAlert, setModal }) {
  return (
    <section className="alertsLayout">
      <article className="card lg">
        <div className="cardHead">
          <div>
            <h2>알림</h2>
            <p>실시간 조건과 읽음 상태</p>
          </div>
          <button className="btn xs primary" onClick={() => addAlert()}>+ 알림</button>
        </div>
        {alerts.length === 0 && <div className="empty">아직 알림이 없어요</div>}
        {alerts.map((item) => (
          <button
            key={item.id}
            className={item.unread ? "alertRow unread" : "alertRow"}
            onClick={() =>
              setAlerts((prev) =>
                prev.map((alert) => (alert.id === item.id ? { ...alert, unread: !alert.unread } : alert))
              )
            }
          >
            <span className="iconWrap"><Bell size={14} /></span>
            <span>
              <b>{item.title}</b>
              <span>{item.body}</span>
            </span>
            <em>{item.time}</em>
          </button>
        ))}
      </article>

      <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
        <article className="card lg">
          <div className="cardHead">
            <div>
              <h2>투자 피드</h2>
              <p>AI · 리스크 · 뉴스 · 행동 통합</p>
            </div>
          </div>
          {feedSeed.map((item) => (
            <button
              key={item.id}
              className={`feedRow ${item.severity}`}
              onClick={() => setModal({ type: "feed", item })}
            >
              <span className="typeTag">{feedTypeLabel(item.type)}</span>
              <span>
                <b>{item.title}</b>
                <p>{item.body}</p>
              </span>
              <em>{item.time}</em>
            </button>
          ))}
        </article>

        <article className="card lg">
          <div className="cardHead">
            <div>
              <h2>북마크 뉴스</h2>
              <p>{bookmarkedNewsIds.length}건 저장</p>
            </div>
          </div>
          {news.filter((item) => bookmarkedNewsIds.includes(item.id)).length === 0 && (
            <div className="empty">저장한 뉴스가 없어요. 상세 페이지에서 뉴스를 클릭해 저장하세요.</div>
          )}
          {news
            .filter((item) => bookmarkedNewsIds.includes(item.id))
            .map((item) => (
              <button
                key={item.id}
                className="newsItem"
                style={{ width: "100%", cursor: "pointer", background: "transparent" }}
                onClick={() => toggleBookmark(item.id)}
              >
                <div className={`thumb ${sentimentClass(item.sentiment)}`}>{item.symbol}</div>
                <div className="info">
                  <h5>{item.title}</h5>
                  <p>{item.summary}</p>
                  <div className="meta">
                    <span className="badge">{sentimentLabel(item.sentiment)}</span>
                    <span>{item.source}</span>
                    <span className="sep" />
                    <span>{item.time}</span>
                  </div>
                </div>
              </button>
            ))}
        </article>
      </div>
    </section>
  );
}

/* ============================================================
   Preflight form
============================================================ */
function PreflightForm({ selected, addAlert }) {
  const [form, setForm] = useState({
    entryPrice: selected.currentPrice,
    stopPrice: Math.round(selected.currentPrice * 0.985),
    takeProfit: Math.round(selected.currentPrice * 1.024),
    amount: 1000000,
  });

  useEffect(() => {
    setForm({
      entryPrice: selected.currentPrice,
      stopPrice: Math.round(selected.currentPrice * 0.985),
      takeProfit: Math.round(selected.currentPrice * 1.024),
      amount: 1000000,
    });
  }, [selected.symbol]);

  const calc = useMemo(() => {
    const entry = Number(form.entryPrice) || 0;
    const stop = Number(form.stopPrice) || 0;
    const take = Number(form.takeProfit) || 0;
    const amount = Number(form.amount) || 0;
    if (!entry || !stop || !take || !amount) return null;
    const lossRate = ((stop - entry) / entry) * 100;
    const winRate = ((take - entry) / entry) * 100;
    const maxLoss = (amount * Math.abs(lossRate)) / 100;
    const expectedGain = (amount * winRate) / 100;
    const ratio = winRate && lossRate ? Math.abs(winRate / lossRate) : 0;
    return {
      lossRate: lossRate.toFixed(2),
      winRate: winRate.toFixed(2),
      maxLoss,
      expectedGain,
      riskReward: `1:${ratio.toFixed(1)}`,
    };
  }, [form]);

  const ratioValue = calc ? parseFloat(calc.riskReward.split(":")[1]) : 0;
  const status = ratioValue >= 1.5 ? "확인 후 진행" : "대기 권장";
  const warn = status === "대기 권장";

  function handleSubmit(event) {
    event.preventDefault();
    if (!calc) return;
    addAlert({
      title: `${selected.symbol} 체크 완료`,
      body: `최대 손실 -${money(calc.maxLoss)}원 · 손익비 ${calc.riskReward}`,
      channel: "in-app",
    });
  }

  return (
    <form onSubmit={handleSubmit}>
      <div className={warn ? "preflightStatus warn" : "preflightStatus"}>
        {warn ? <AlertTriangle size={20} /> : <CheckCircle2 size={20} />}
        <strong>{status}</strong>
        <em>orderExecution: false</em>
      </div>
      <div className="preflightForm">
        <div className="field">
          <label>진입가 (원)</label>
          <input
            type="number"
            value={form.entryPrice}
            onChange={(event) => setForm({ ...form, entryPrice: event.target.value })}
          />
        </div>
        <div className="field">
          <label>손절가 (원)</label>
          <input
            type="number"
            value={form.stopPrice}
            onChange={(event) => setForm({ ...form, stopPrice: event.target.value })}
          />
        </div>
        <div className="field">
          <label>익절가 (원)</label>
          <input
            type="number"
            value={form.takeProfit}
            onChange={(event) => setForm({ ...form, takeProfit: event.target.value })}
          />
        </div>
        <div className="field">
          <label>투자 금액 (원)</label>
          <input
            type="number"
            value={form.amount}
            onChange={(event) => setForm({ ...form, amount: event.target.value })}
          />
        </div>
      </div>
      {calc && (
        <div className="calcSummary">
          <div className="calcCell">
            <span>최대 손실</span>
            <strong className="down">-{money(calc.maxLoss)}원</strong>
          </div>
          <div className="calcCell">
            <span>목표 수익</span>
            <strong className="up">+{money(calc.expectedGain)}원</strong>
          </div>
          <div className="calcCell">
            <span>손익비</span>
            <strong>{calc.riskReward}</strong>
          </div>
        </div>
      )}
      <button type="submit" className="btn primary wide" style={{ marginTop: 14 }}>
        <ShieldCheck size={14} /> 코치에게 체크 요청
      </button>
      <p style={{ fontSize: 12, color: "var(--muted)", marginTop: 10, lineHeight: 1.5 }}>
        SALT는 매수/매도를 실행하지 않습니다. 코치는 위험·손익비·비중만 검증해요.
      </p>
    </form>
  );
}

/* ============================================================
   Modal
============================================================ */
function PrototypeModal({ modal, selected, coach, close, addHolding, addAlert }) {
  return (
    <div className="modalBackdrop" onClick={close}>
      <section className="modal" onClick={(event) => event.stopPropagation()}>
        <button className="closeBtn" onClick={close}>×</button>
        {modal.type === "holding" && <HoldingForm preset={selected.symbol} onSave={addHolding} close={close} />}
        {modal.type === "preflight" && (
          <>
            <h2>주문 전 체크</h2>
            <p>이 프로토타입은 직접 매수/매도를 실행하지 않습니다. 코치는 진입 전 위험만 검증해요.</p>
            <PreflightForm selected={selected} addAlert={addAlert} />
          </>
        )}
        {modal.type === "feed" && (
          <>
            <h2>{modal.item.title}</h2>
            <p>{modal.item.body}</p>
            <div style={{ display: "flex", gap: 6, marginTop: 8 }}>
              <span className="tag brand">{feedTypeLabel(modal.item.type)}</span>
              <span className="tag">{modal.item.time}</span>
            </div>
          </>
        )}
      </section>
    </div>
  );
}

function HoldingForm({ preset, onSave, close }) {
  const [form, setForm] = useState({
    symbol: preset,
    transactionType: "buy",
    quantity: 0.01,
    averagePrice: 0,
    memo: "",
  });

  function handleSubmit(event) {
    event.preventDefault();
    onSave(form);
  }

  return (
    <>
      <h2>거래 기록 추가</h2>
      <p>실제 주문이 아니라 보유 수량과 평균 단가를 직접 기록합니다.</p>
      <form onSubmit={handleSubmit} style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
        <div className="field">
          <label>자산</label>
          <input
            value={form.symbol}
            onChange={(event) => setForm({ ...form, symbol: event.target.value.toUpperCase() })}
          />
        </div>
        <div className="field">
          <label>거래 종류</label>
          <select
            value={form.transactionType}
            onChange={(event) => setForm({ ...form, transactionType: event.target.value })}
          >
            <option value="buy">매수</option>
            <option value="sell">매도</option>
          </select>
        </div>
        <div className="field">
          <label>수량</label>
          <input
            type="number"
            step="0.0001"
            value={form.quantity}
            onChange={(event) => setForm({ ...form, quantity: event.target.value })}
          />
        </div>
        <div className="field">
          <label>평균 단가 (원)</label>
          <input
            type="number"
            value={form.averagePrice}
            onChange={(event) => setForm({ ...form, averagePrice: event.target.value })}
          />
        </div>
        <div className="field" style={{ gridColumn: "1 / -1" }}>
          <label>메모</label>
          <textarea
            value={form.memo}
            onChange={(event) => setForm({ ...form, memo: event.target.value })}
          />
        </div>
        <button type="submit" className="btn primary wide" style={{ gridColumn: "1 / -1" }}>저장</button>
        <button type="button" className="btn ghost wide" style={{ gridColumn: "1 / -1" }} onClick={close}>
          취소
        </button>
      </form>
    </>
  );
}

/* ============================================================
   Shared components
============================================================ */
function ModeSwitch({ mode, setMode }) {
  return (
    <div className="modeSwitch">
      {[["scalp", "단타"], ["long", "장기"]].map(([value, label]) => (
        <button
          key={value}
          className={mode === value ? "active" : ""}
          onClick={() => setMode(value)}
        >
          {label}
        </button>
      ))}
    </div>
  );
}

function ChangeRate({ value, blink }) {
  const className = `changeRate ${rateTone(value)} ${blink ? "blink" : ""}`.trim();
  return <span className={className}>{signed(value)}%</span>;
}

function DecisionPill({ action }) {
  const label = {
    scalp: "단타 유리",
    collect: "장기 모으기",
    hold: "관찰",
    wait: "대기",
  }[action] ?? "관찰";
  return <em className={`decisionPill ${action}`} style={{ fontStyle: "normal" }}>{label}</em>;
}

function Coin({ symbol, large, xl }) {
  const className = "coin" + (xl ? " xl" : large ? " lg" : "");
  return <span className={className}>{symbol.slice(0, 1)}</span>;
}

function TradingChart({ symbol, price, compact, large, zones }) {
  const ref = useRef(null);
  useEffect(() => {
    if (!ref.current) return undefined;
    const height = large ? 420 : compact ? 220 : 280;
    const chart = createChart(ref.current, {
      width: ref.current.clientWidth,
      height,
      layout: { background: { type: ColorType.Solid, color: "#ffffff" }, textColor: "#868e96" },
      grid: { vertLines: { color: "#f0f2f4" }, horzLines: { color: "#f0f2f4" } },
      rightPriceScale: { borderVisible: false },
      timeScale: { borderVisible: false, timeVisible: true },
    });
    const candles = chart.addSeries(CandlestickSeries, {
      upColor: "#ff2e55",
      downColor: "#1677ee",
      borderVisible: false,
      wickUpColor: "#ff2e55",
      wickDownColor: "#1677ee",
    });
    const volume = chart.addSeries(HistogramSeries, {
      priceScaleId: "",
      priceFormat: { type: "volume" },
      color: "rgba(0, 122, 255, .18)",
    });
    const data = makeCandles(price);
    candles.setData(data.map(({ volume: _volume, ...item }) => item));
    volume.setData(data.map((item) => ({ time: item.time, value: item.volume })));

    if (zones && zones.length > 0) {
      zones.forEach((zone) => {
        candles.createPriceLine({
          price: zone.price,
          color: zone.color,
          lineWidth: zone.lineWidth ?? 2,
          lineStyle: zone.style ?? LineStyle.Dashed,
          axisLabelVisible: true,
          title: zone.title,
        });
      });
    }

    chart.timeScale().fitContent();
    const resize = () => chart.applyOptions({ width: ref.current.clientWidth });
    window.addEventListener("resize", resize);
    return () => {
      window.removeEventListener("resize", resize);
      chart.remove();
    };
  }, [symbol, price, compact, large, zones]);
  const cls = "tvChart" + (large ? " lg" : compact ? " compact" : "");
  return <div className={cls} ref={ref} />;
}

/* ============================================================
   Logic helpers
============================================================ */
function sortMarkets(markets, filter, query) {
  let items = [...markets];
  if (query) {
    const q = query.toLowerCase();
    items = items.filter(
      (item) =>
        item.symbol.toLowerCase().includes(q) ||
        item.koreanName.toLowerCase().includes(q) ||
        item.englishName.toLowerCase().includes(q)
    );
  }
  const sign = filter.order === "asc" ? 1 : -1;
  switch (filter.sort) {
    case "volume":
      return items.sort((a, b) => (a.tradeValue24h - b.tradeValue24h) * sign);
    case "change":
      return items.sort((a, b) => (a.change24h - b.change24h) * sign);
    case "price":
      return items.sort((a, b) => (a.currentPrice - b.currentPrice) * sign);
    case "name":
      return items.sort((a, b) => a.koreanName.localeCompare(b.koreanName) * sign);
    default:
      return items;
  }
}

function summarizePortfolio(holdings) {
  const total = holdings.reduce((sum, item) => sum + item.quantity * item.currentPrice, 0);
  const invested = holdings.reduce((sum, item) => sum + item.quantity * item.averagePrice, 0);
  const profit = total - invested;
  const profitRate = invested ? (profit / invested) * 100 : 0;
  return { total, invested, profit, profitRate };
}

function makeCoach(selected, holdings, mode) {
  const holding = holdings.find((item) => item.symbol === selected.symbol);
  const long = mode === "long";
  const decision = long
    ? {
        label: selected.action === "collect" ? "장기 매집 후보" : "장기 관찰",
        headline: selected.action === "collect" ? "장기적으로 모을 수 있어요" : "지금은 장기 관찰이 좋아요",
        summary: "가격 구간을 나눠 기록하고 포트폴리오 비중이 과해지지 않도록 월 단위로 점검하세요.",
      }
    : {
        label: selected.action === "scalp" ? "단타 진입 후보" : "단타 대기",
        headline: selected.action === "scalp" ? "지금 단타 이득 후보예요" : "지금 단타는 기다리는 편이 좋아요",
        summary: "거래량과 변동성은 있지만 손실 한도와 재진입 기준을 먼저 정하세요.",
      };
  const confidence = Math.min(94, Math.max(48, selected.confidence + (long ? -4 : 3)));
  const concentration = holding?.weight ?? 0;
  const overConcentration = concentration > 55;

  return {
    mode,
    confidence,
    actionKey: selected.action,
    decision,
    evidence: [
      { label: "가격 / 거래량", value: selected.change24h > 0 ? "상승 탄력" : "반등 확인 필요", tone: selected.change24h > 0 ? "up" : "down" },
      { label: "포트 비중", value: holding ? `${holding.weight}%` : "0%", tone: overConcentration ? "warn" : "up" },
      { label: "뉴스 분위기", value: selected.symbol === "BTC" || selected.symbol === "SOL" ? "긍정" : "중립", tone: "up" },
      { label: "행동 리스크", value: "추격 진입 주의", tone: "warn" },
    ],
    risks: [
      { code: "missing_stop", label: "손절 미설정", body: long ? "장기 낙폭 기준이 필요해요." : "단타 손절 가격을 먼저 정하세요." },
      { code: "concentration", label: overConcentration ? "단일 자산 비중 초과" : "비중 양호", body: overConcentration ? `현재 ${concentration}%로 한도 근접` : "포트 비중이 허용 범위에 있어요." },
    ],
    plan: [
      { label: "1단계 · 손실 보호", value: long ? "-3.5%" : "-1.2%", tone: "down", copy: "먼저 정한 손실 한도를 넘기면 판단을 다시 봅니다." },
      { label: "2단계 · 첫 수익", value: long ? "+8%" : "+1.4%", tone: "up", copy: "분할 익절 1차 — 30% 비중 줄이기." },
      { label: "3단계 · 추세 유지", value: long ? "+14%" : "+2.0%", tone: "up", copy: "추세 이탈 시 손절 라인을 본전으로 올립니다." },
      { label: "4단계 · 최대 수익", value: long ? "+18%" : "+2.4%", tone: "up", copy: "전량 익절 또는 코치 재판단 요청." },
    ],
    behavior: [
      { title: "계획 먼저", body: "진입 전 목표·손실·비중을 모두 적었어요.", passed: true },
      { title: "추격 방지", body: "급등 직후에는 5분 캔들 확인이 필요해요.", passed: false },
      { title: "복기 기록", body: "결정 후 피드백을 남기면 다음 코치가 개선됩니다.", passed: true },
      { title: "분할 진입", body: "1회 모두 진입 대신 2~3분할을 유지하세요.", passed: false },
    ],
    performance: [
      { label: "단타 신호 승률", value: "64%", width: 64, tone: "up" },
      { label: "장기 후보 30일 유지율", value: "71%", width: 71, tone: "up" },
      { label: "손실 한도 준수", value: "82%", width: 82, tone: "up" },
      { label: "추격 진입 감소", value: "38%", width: 38, tone: "warn" },
    ],
  };
}

function makeIntelligence(selected, news) {
  const positive = news.filter((item) => item.symbol === selected.symbol && item.sentiment === "positive").length;
  const negative = news.filter((item) => item.symbol === selected.symbol && item.sentiment === "negative").length;
  const raw = 60 + selected.change24h * 3 + positive * 4 - negative * 6;
  const sentimentScore = Math.max(10, Math.min(95, Math.round(raw)));
  const emoji = sentimentScore > 75 ? "🔥" : sentimentScore > 55 ? "🌤" : sentimentScore > 40 ? "🌥" : "❄️";
  const sentimentLabel = sentimentScore > 75 ? "뜨거움" : sentimentScore > 55 ? "탐욕" : sentimentScore > 40 ? "중립" : "공포";
  const sentimentMessage =
    sentimentScore > 75
      ? "과열 신호가 보여요. 추격 진입은 위험할 수 있어요."
      : sentimentScore > 55
      ? "긍정 신호가 많지만 분할 진입을 권장해요."
      : sentimentScore > 40
      ? "방향성이 약해요. 진입 전 추가 신호를 기다리세요."
      : "공포 구간이에요. 분할 매집을 고려할 수 있어요.";

  const score = Math.max(-100, Math.min(100, Math.round(selected.change24h * 18 + positive * 14 - negative * 22)));
  const signal = score > 50 ? "강한 매수" : score > 0 ? "약한 매수" : score === 0 ? "중립" : score > -50 ? "약한 매도" : "강한 매도";
  const smartMessage = score > 0
    ? "대량 매수가 매도보다 우세해요."
    : score < 0
    ? "대형 매도세가 우세해요."
    : "양방향 흐름이 균형이에요.";

  return {
    sentimentScore,
    sentimentLabel,
    sentimentMessage,
    emoji,
    smartMoney: {
      score,
      signal,
      message: smartMessage,
      largeBuys: 12 + (selected.change24h > 0 ? 8 : 0),
      largeSells: 4 + (selected.change24h < 0 ? 6 : 0),
      orderbookRatio: score > 0 ? "1.5:1" : score < 0 ? "0.7:1" : "1.0:1",
    },
  };
}

function makeBuyZones(selected, mode) {
  const price = selected.currentPrice;
  const long = mode === "long";
  const buyCenter = Math.round(price * (long ? 0.95 : 0.992));
  const buyUpper = Math.round(buyCenter * 1.004);
  const buyLower = Math.round(buyCenter * 0.996);
  const stop = Math.round(price * (long ? 0.965 : 0.985));
  const tp1 = Math.round(price * (long ? 1.08 : 1.012));
  const tp2 = Math.round(price * (long ? 1.18 : 1.024));
  const zones = [
    { key: "buyUpper", price: buyUpper, title: "매수존 상단", color: "rgba(0, 122, 255, 0.55)", style: LineStyle.Dashed, lineWidth: 1 },
    { key: "buyCenter", price: buyCenter, title: "매수 적정가", color: "#007aff", style: LineStyle.Solid, lineWidth: 2 },
    { key: "buyLower", price: buyLower, title: "매수존 하단", color: "rgba(0, 122, 255, 0.55)", style: LineStyle.Dashed, lineWidth: 1 },
    { key: "stop", price: stop, title: "손절선", color: "#1677ee", style: LineStyle.Solid, lineWidth: 2 },
    { key: "tp1", price: tp1, title: "1차 익절", color: "#ff2e55", style: LineStyle.Dashed, lineWidth: 1 },
    { key: "tp2", price: tp2, title: "2차 익절", color: "#ff2e55", style: LineStyle.Solid, lineWidth: 2 },
  ];
  return {
    zones,
    summary: { buyCenter, buyUpper, buyLower, stop, tp1, tp2, currentPrice: price },
  };
}

function makeCandles(price) {
  const start = Math.floor(Date.now() / 1000) - 60 * 34;
  return Array.from({ length: 34 }, (_, index) => {
    const base = price * (0.972 + index * 0.0015 + Math.sin(index / 2.8) * 0.004);
    const open = base * (0.996 + Math.random() * 0.006);
    const close = base * (0.996 + Math.random() * 0.006);
    return {
      time: start + index * 60,
      open: Math.round(open),
      high: Math.round(Math.max(open, close) * 1.004),
      low: Math.round(Math.min(open, close) * 0.996),
      close: Math.round(close),
      volume: Math.round(120 + Math.random() * 260),
    };
  });
}

function modeLabel(mode) {
  return mode === "scalp" ? "단타" : "장기";
}

function feedTypeLabel(type) {
  return { ai: "AI", risk: "리스크", news: "뉴스", behavior: "행동" }[type] ?? type;
}

function sentimentLabel(sentiment) {
  return { positive: "긍정", negative: "부정", neutral: "중립" }[sentiment] ?? sentiment;
}

function sentimentClass(sentiment) {
  return { positive: "up", negative: "down", neutral: "neutral" }[sentiment] ?? "neutral";
}

function money(value) {
  return new Intl.NumberFormat("ko-KR").format(Math.round(Number(value) || 0));
}

function signed(value) {
  return `${value > 0 ? "+" : ""}${value}`;
}

function rateTone(value) {
  if (value > 0) return "up";
  if (value < 0) return "down";
  return "flat";
}
