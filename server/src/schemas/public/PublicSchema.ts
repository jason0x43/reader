// @generated
// This file is automatically generated by Kanel. Do not modify manually.

import type { default as AccountTable } from "./Account.js";
import type { default as AccountArticleTable } from "./AccountArticle.js";
import type { default as SessionTable } from "./Session.js";
import type { default as PasswordTable } from "./Password.js";
import type { default as FeedTable } from "./Feed.js";
import type { default as FeedLogTable } from "./FeedLog.js";
import type { default as FeedGroupTable } from "./FeedGroup.js";
import type { default as FeedGroupFeedTable } from "./FeedGroupFeed.js";
import type { default as ArticleTable } from "./Article.js";

export default interface PublicSchema {
	account: AccountTable;

	account_article: AccountArticleTable;

	session: SessionTable;

	password: PasswordTable;

	feed: FeedTable;

	feed_log: FeedLogTable;

	feed_group: FeedGroupTable;

	feed_group_feed: FeedGroupFeedTable;

	article: ArticleTable;
}
