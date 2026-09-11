import {
  ArticleNotFoundError,
  BookmarkNotFoundError,
  type ArticleRepository,
  type BookmarkRepository,
} from "../domain";

/**
 * 북마크 추가.
 *
 * 이미 있으면 **던지지 않는다** — 같은 기사를 두 번 담는 것은 실패가 아니라
 * 아무 일도 일어나지 않는 것이다. 원문의 응답 문구를 그대로 둔다.
 */
export class BookmarkArticle {
  constructor(
    private readonly articles: ArticleRepository,
    private readonly bookmarks: BookmarkRepository
  ) {}

  async execute(userId: string, newsId: string) {
    if (!(await this.articles.exists(newsId))) throw new ArticleNotFoundError();

    if (await this.bookmarks.exists(userId, newsId)) {
      return { message: "Already bookmarked" };
    }

    await this.bookmarks.add(userId, newsId);
    return { message: "Bookmark added successfully" };
  }
}

export class RemoveBookmark {
  constructor(private readonly bookmarks: BookmarkRepository) {}

  async execute(userId: string, newsId: string) {
    const removed = await this.bookmarks.remove(userId, newsId);
    if (!removed) throw new BookmarkNotFoundError();
    return { message: "Bookmark removed successfully" };
  }
}

export class ListBookmarks {
  constructor(private readonly bookmarks: BookmarkRepository) {}

  async execute(userId: string, page = 1, limit = 20) {
    const { articles, total } = await this.bookmarks.listArticles(
      userId,
      page,
      limit
    );

    return {
      bookmarks: articles,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }
}
