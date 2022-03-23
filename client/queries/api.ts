import {
  Article,
  ArticleHeading,
  Feed,
  FeedStats,
  LoginResponse,
  UpdateUserArticleRequest,
  User,
  UserArticle,
  UserArticlesResponse,
} from "../../types.ts";

/**
 * An error thrown when a response indicates failure
 */
export class ResponseError<T = unknown> extends Error {
  private _status: number;
  private _body: T;

  static async create<B = unknown>(
    response: Response,
    action?: string,
  ): Promise<ResponseError<B>> {
    let body: unknown;
    try {
      body = await response.text();
      body = JSON.parse(body as string);
    } catch (error) {
      console.warn("Error readin body", error);
      // ignore, just use the original text
    }

    return new ResponseError(
      action,
      response.status,
      response.statusText,
      body as B,
    );
  }

  constructor(
    action: string | undefined,
    status: number,
    statusText: string,
    body: T,
  ) {
    super(action ? `Error while ${action}` : statusText);
    this._status = status;
    this._body = body;
  }

  get status() {
    return this._status;
  }

  get body() {
    return this._body;
  }
}

/**
 * Throw an error if a response has a failing status
 */
async function assertSuccess(response: Response, action?: string) {
  if (response.status >= 400) {
    throw await ResponseError.create(response, action);
  }
}

/**
 * Refresh (download) the user's subscribed feeds
 */
export async function refreshFeeds() {
  const response = await fetch("/refresh");
  await assertSuccess(response, "refreshing feeds");
}

/**
 * Set the `read` state of a list of articles
 */
export async function setRead(
  articleIds: number[],
  read = true,
  isSelected = false,
): Promise<UserArticle[]> {
  if (isSelected && articleIds.length > 1) {
    throw new Error('Only a single article ID may be marked as "selected"');
  }

  const body: UpdateUserArticleRequest = articleIds.map((articleId) => ({
    articleId,
    read,
    isSelected,
  }));

  const response = await fetch(`/user_articles`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  await assertSuccess(
    response,
    `updating read status of articles ${JSON.stringify(articleIds)} to ${read}`,
  );

  return response.json();
}

/**
 * Return data for the current user
 */
export async function getUser(): Promise<User> {
  const response = await fetch("/user");
  await assertSuccess(response, "getting current user");
  return await response.json();
}

/**
 * Login a user
 */
export async function login(
  username: string,
  password: string,
): Promise<LoginResponse> {
  const response = await fetch("/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, password }),
  });
  await assertSuccess(response, `logging in ${username}`);
  return await response.json();
}

/**
 * Logout a user
 */
export async function logout(): Promise<void> {
  const response = await fetch("/logout", {
    method: "GET",
    headers: { "Content-Type": "application/json" },
  });
  await assertSuccess(response, `logged out current user`);
  return await response.json();
}

/**
 * Get the articles for a list of feed IDs
 */
export async function getArticles(feedIds: number[]): Promise<Article[]> {
  const params = new URLSearchParams();
  params.set("feeds", feedIds.map(String).join(","));
  const response = await fetch(`/articles?${params}`);
  await assertSuccess(
    response,
    `getting articles for ${JSON.stringify(feedIds)}`,
  );
  return await response.json();
}

/**
 * Get article headings for a list of feed IDs
 */
export async function getArticleHeadings(
  feedIds: number[],
): Promise<ArticleHeading[]> {
  const params = new URLSearchParams();
  params.set("feeds", feedIds.map(String).join(","));
  params.set("brief", "1");
  const response = await fetch(`/articles?${params}`);
  await assertSuccess(
    response,
    `getting article headings for ${JSON.stringify(feedIds)}`,
  );
  return await response.json();
}

/**
 * Get a specific article
 */
export async function getArticle(articleId: number): Promise<Article> {
  const response = await fetch(`/articles/${articleId}`);
  await assertSuccess(response, `getting article ${articleId}`);
  return await response.json();
}

/**
 * Get feed data for a list of feed IDs
 */
export async function getFeeds(feedIds?: number[]): Promise<Feed[]> {
  const params = new URLSearchParams();
  if (feedIds) {
    params.set("feeds", feedIds.map(String).join(","));
  }
  const response = await fetch(`/feeds?${params}`);
  await assertSuccess(response, "getting feeds");
  return await response.json();
}

/**
 * Get statistics for a list of feeds
 */
export async function getFeedStats(feedIds?: number[]): Promise<FeedStats> {
  const params = new URLSearchParams();
  if (feedIds) {
    params.set("feeds", feedIds.map(String).join(","));
  }
  const response = await fetch(`/feedstats?${params}`);
  await assertSuccess(response, "getting feed stats");
  return await response.json();
}

/**
 * Get the user article flags for the articles in a list of feeds
 */
export async function getUserArticles(
  feedIds?: number[],
): Promise<UserArticle[]> {
  const params = new URLSearchParams();
  if (feedIds) {
    params.set("feeds", feedIds.map(String).join(","));
  }
  const response = await fetch(`/user_articles?${params}`);
  await assertSuccess(response, "getting user articles");
  return await response.json();
}

/**
 * Indicate if the given object is a ResponseError
 */
export function isResponseError(error: unknown): error is ResponseError {
  return error !== undefined && error !== null && typeof error === "object" &&
    error instanceof ResponseError;
}