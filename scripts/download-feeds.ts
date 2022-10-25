//
// Download feeds
//

import { JSDOM } from 'jsdom';
import Parser, { type Item } from 'rss-parser';
import { upsertArticle } from '../src/lib/db/article.js';
import { getFeeds, updateFeedIcon } from '../src/lib/db/feed.js';
import { Feed } from '../src/lib/db/schema.js';
import { downloadFeed as getFeed, FeedItem } from '../src/lib/feed.js';

type ParsedFeed = Parser.Output<unknown>;

let feedCount = 0;

async function downloadFeeds() {
	console.log('>>> Downloading feeds...');
	const feeds = getFeeds();
	feedCount = feeds.length;
	await Promise.all(feeds.map(downloadFeed));
	console.log('>>> Finished downloading');
}

async function downloadFeed(feed: Feed) {
	try {
		if (feed.disabled) {
			console.debug(`>>> Skipping disabled feed ${feed.id}`);
			return;
		}

		const parsedFeed = await getFeed(feed.url);

		if (!feed.icon) {
			const icon = await getIcon(parsedFeed);
			updateFeedIcon({
				feedId: feed.id,
				icon
			});
			console.log(`>>> Updated icon for ${feed.url}`);
		}

		for (const entry of parsedFeed.items) {
			const articleId = getArticleId(entry);
			const content = getContent(entry);

			upsertArticle({
				articleId,
				feedId: feed.id,
				content,
				title: entry.title ?? 'Untitled',
				link: entry.link ?? null,
				published: entry.pubDate ? Number(new Date(entry.pubDate)) : Date.now()
			});
		}

		console.debug(`>>> Processed feed ${feed.title} (${feedCount} left)`);
	} catch (error) {
		console.error(`>>> Error updating ${feed.url}: ${error}`);
	} finally {
		feedCount--;
	}
}

/**
 * Get the content of a feed item
 */
function getContent(entry: FeedItem): string {
	let content =
		entry['content:encoded'] ?? entry.content ?? entry.summary ?? null;
	if (content) {
		try {
			const dom = new JSDOM(content);
			dom.window.document.querySelectorAll('a').forEach((a) => {
				a.removeAttribute('style');
			});
			content = dom.window.document.body.innerHTML;
		} catch (error) {
			console.warn('Error processing document content');
		}
	}
	return content;
}

/**
 * Return some sort of unique ID for an article
 */
function getArticleId(article: Item & { [key: string]: unknown }): string {
	if (article.guid) {
		return article.guid;
	}

	if (article.id) {
		return article.id as string;
	}

	if (article.link) {
		return article.link;
	}

	return hashString(
		article.title ?? '' + article.summary ?? '' + article.content ?? ''
	);
}

async function getIcon(feed: ParsedFeed): Promise<string | null> {
	if (feed.image) {
		const response = await fetch(feed.image.url, { method: 'HEAD' });
		if (response.status === 200) {
			console.debug(`Using feed icon ${feed.image} for ${feed.title}`);
			return feed.image.url;
		}
	}

	if (feed.link) {
		const feedBase = new URL(feed.link).origin;
		const htmlResponse = await fetch(feedBase);
		const html = await htmlResponse.text();
		const dom = new JSDOM(html);
		const iconLink =
			dom.window.document.head.querySelector('link[rel*="icon"]');

		if (iconLink) {
			const iconHref = iconLink.getAttribute('href') as string;
			const iconUrl = new URL(iconHref, feedBase);

			// Try https by default
			iconUrl.protocol = 'https';
			const iconResponse = await fetch(`${iconUrl}`, { method: 'HEAD' });
			if (iconResponse.status === 200) {
				console.debug(`Using link ${iconUrl} for ${feed.title}`);
				return `${iconUrl}`;
			}

			iconUrl.protocol = 'http';
			const httpIconResponse = await fetch(`${iconUrl}`, { method: 'HEAD' });
			if (httpIconResponse.status === 200) {
				console.debug(`Using link ${iconUrl} for ${feed.title}`);
				return `${iconUrl}`;
			}
		}

		const favicon = new URL('/favicon.ico', feedBase);
		const response = await fetch(`${favicon}`, { method: 'HEAD' });
		if (
			response.status === 200 &&
			response.headers.get('content-length') !== '0'
		) {
			console.debug(`Using favicon ${favicon} for ${feed.title}`);
			return `${favicon}`;
		}
	}

	return null;
}

function hashString(str: string): string {
	let hash = 0;
	for (let i = 0; i < str.length; i++) {
		const char = str.charCodeAt(i);
		hash = (hash << 5) - hash + char;
		hash &= hash;
	}
	return new Uint32Array([hash])[0].toString(36);
}

downloadFeeds();

setInterval(() => {
	downloadFeeds();
}, 600_000);
