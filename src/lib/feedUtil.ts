import type { Feed } from '@prisma/client';
import type { FeedStats } from './db/feed';
import type { FeedGroupWithFeeds } from './db/feedgroup';
import type { ArticleFilter } from './types';

/**
 * Get the number of articles from a list of feeds that match a filter
 */
export function getArticleCount(
  feeds: Feed[],
  feedStats: FeedStats,
  articleFilter: ArticleFilter
): number {
  return feeds.reduce((acc, feed) => {
    const stats = feedStats[feed.id] ?? {};
    return (
      acc +
      (articleFilter === 'unread' ? stats.total - stats.read : stats.total)
    );
  }, 0);
}

/**
 * Get the feeds identified by a feed group
 */
export function getGroupFeeds(
  group: FeedGroupWithFeeds,
  feeds: Feed[]
): Feed[] {
  const groupFeeds: Feed[] = [];
  for (const feedGroupFeed of group.feeds) {
    const feed = feeds.find(({ id }) => id === feedGroupFeed.feedId);
    if (feed) {
      groupFeeds.push(feed);
    }
  }
  return groupFeeds;
}

/**
 * Return true if all the item IDs are contained in the given list of IDs
 */
export function areIdentified<T>(
  items: { id: T }[],
  ids: T[] | undefined
): boolean {
  if (!ids) {
    return false;
  }
  return items.every(({ id }) => ids.includes(id));
}