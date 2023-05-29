import '@total-typescript/ts-reset';
import type { SessionWithUser } from '$lib/db/session';
import type { ArticleWithUserData } from '$lib/db/article';
import type { FeedGroupWithFeeds } from '$lib/db/feedgroup';
import type { Feed, FeedStats } from '$lib/db/feed';

declare global {
	namespace App {
		interface Locals {
			session?: SessionWithUser;
		}

		interface PageData {
			articleFilter?: 'unread' | 'all';
			articles?: ArticleWithUserData[];
			article?: ArticleWithUserData;
			feedGroups?: FeedGroupWithFeeds[];
			feedId?: string;
			feedStats?: FeedStats;
			feeds?: Feed[];
			selectedFeedIds?: Feed['id'][];
			user: User;
			userFeeds?: Feed[];
		}
	}
}
