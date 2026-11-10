"use client";

// 클라이언트 잎: 모달 열림 상태 · 지금 주소를 쥔다.
import { AppNavigationSearch } from "@repo/ui/app-navigation";
import { usePathname, useRouter } from "next/navigation";
import { Suspense, useCallback, useState } from "react";

import { NEWS_MESSAGES, NewsModal, type NewsArticleView } from "@/entities/market";
import { AssetSearchDialog } from "@/widgets/asset-search";
import { ROUTES } from "@repo/web-shared/config";

import { SEARCH_PAGE } from "../model";

/**
 * 투자 zone 머리 검색칸 + 검색 모달 (`FE-REQ-066` FR-1 · `FE-REQ-067` FR-2) — zone 레이아웃이 `AppShell` `headerSearch` 로 꽂는다.
 *
 * - 머리 칸을 누르거나 `/` 를 누르면 연다(글을 쓰는 중이 아닐 때 — `@repo/ui` `AppNavigationSearch`). 주소는 바뀌지 않는다
 * - `/search` 주소면 **모달이 열린 채** 그린다(D5 — 링크 · 새로고침 호환). 그때만 `?q=` 를 읽고 쓰고, 닫으면 투자 화면으로 간다
 * - 모달은 이 하나뿐이다 — `/search` 페이지가 따로 모달을 두면 두 벌이 겹친다
 * - 닫으면 포커스는 연 자리로(머리 칸 · `/` 를 누를 때 있던 곳 — `Modal` 포커스 가둠이 돌린다)
 * - 뉴스 줄(FR-8)은 검색 모달을 닫고 **여기서** 뉴스 모달을 연다 — 모달 둘이 겹치지 않는다. 주소를 쓰지 않는다(`?news=` 는 그 소식이 실린
 *   화면만 읽는다 — 검색 결과 기사는 그 목록에 없을 수 있다). 아래 "다른 소식"은 같은 검색의 나머지 뉴스
 */
export const SearchLauncher = () => {
  const pathname = usePathname();
  const router = useRouter();
  const onSearchRoute = pathname === ROUTES.search;
  const [open, setOpen] = useState(false);
  const [news, setNews] = useState<{ article: NewsArticleView; all: NewsArticleView[] } | null>(null);

  const dismiss = useCallback(() => {
    if (onSearchRoute) router.replace(ROUTES.investments);
    else setOpen(false);
  }, [onSearchRoute, router]);

  const navigate = useCallback(
    (href: string) => {
      setOpen(false);
      router.push(href);
    },
    [router],
  );

  const openNews = useCallback(
    (article: NewsArticleView, more: NewsArticleView[]) => {
      setNews({ article, all: [article, ...more] });
      if (onSearchRoute) router.replace(ROUTES.investments);
      else setOpen(false);
    },
    [onSearchRoute, router],
  );

  return (
    <>
      <AppNavigationSearch
        label={SEARCH_PAGE.title}
        hint={SEARCH_PAGE.headerHint}
        onPress={() => setOpen(true)}
        // `/search` 에선 이미 열려 있다 — 단축키가 두 번째를 열지 않게
        shortcut={!onSearchRoute}
      />
      {/* `?q=` 를 읽는 훅(`useSearchParams`)의 경계 — 정적 렌더가 레이아웃 전체를 클라이언트로 미루지 않게 */}
      <Suspense fallback={null}>
        <AssetSearchDialog
          open={(open || onSearchRoute) && news === null}
          onDismiss={dismiss}
          onNavigate={navigate}
          syncUrl={onSearchRoute}
          onOpenNews={openNews}
        />
      </Suspense>
      <NewsModal
        article={news?.article ?? null}
        more={news ? news.all.filter((view) => view.id !== news.article.id) : []}
        moreTitle={NEWS_MESSAGES.moreSearch}
        onSelect={(id) => setNews((current) => (current ? { ...current, article: current.all.find((v) => v.id === id) ?? current.article } : current))}
        onClose={() => setNews(null)}
      />
    </>
  );
};
