import { createId } from '@paralleldrive/cuid2';
import type { Transaction } from 'kysely';
import { isDefined } from '../util';
import { getFeedGroupWithFeeds } from './feedgroup';
import type {
	Article,
	Database,
	Feed,
	FeedGroup,
	User,
	UserArticle
} from './lib/db';
import db from './lib/db.js';

export type { Article };

export type ArticleHeading = Pick<
	Article,
	'id' | 'feed_id' | 'article_id' | 'title' | 'link' | 'published'
>;

export type ArticleUserData = Omit<UserArticle, 'user_id' | 'article_id'>;

export type ArticleHeadingWithUserData = Omit<Article, 'content'> &
	ArticleUserData;

export type ArticleWithUserData = Article & Partial<ArticleUserData>;

export async function getArticle({
	id,
	userId
}: {
	id: Article['id'];
	userId: User['id'];
}): Promise<ArticleWithUserData> {
	const article = await db
		.selectFrom('article')
		.selectAll()
		.where('id', '=', id)
		.executeTakeFirstOrThrow();

	const userArticle = await db
		.selectFrom('user_article')
		.select(['read', 'saved'])
		.where('user_id', '=', userId)
		.where('article_id', '=', id)
		.executeTakeFirst();

	return {
		...article,
		...userArticle
	};
}

export async function getArticleHeadings(
	userId: User['id'],
	options?: {
		feedIds?: Feed['id'][];
		maxAge?: number;
	}
): Promise<ArticleHeadingWithUserData[]> {
	let query = db
		.selectFrom('article')
		.leftJoin('user_article', (join) =>
			join
				.onRef('user_article.article_id', '=', 'article.id')
				.on('user_article.user_id', '=', userId)
		)
		.select([
			'id',
			'feed_id',
			'article.article_id',
			'title',
			'link',
			'published',
			'read',
			'saved'
		]);

	if (options?.feedIds) {
		query = query.where('feed_id', 'in', options.feedIds);
	}

	if (options?.maxAge !== undefined) {
		const cutoff = BigInt(Date.now() - options.maxAge);
		query = query.where('published', '>', cutoff);
	}

	// sort in descending order by publish date for maxAge, then sort the
	// result in ascending order
	const articles = await query.orderBy('published', 'desc').execute();
	articles.sort((a, b) => Number(a.published - b.published));

	return articles;
}

export async function getFeedArticleHeadings(
	userId: User['id'],
	feedId: Feed['id'],
	options?: {
		maxAge?: number;
	}
): Promise<ArticleHeadingWithUserData[]> {
	return getArticleHeadings(userId, {
		feedIds: [feedId],
		maxAge: options?.maxAge
	});
}

export async function getGroupArticleHeadings(
	userId: User['id'],
	feedGroupId: FeedGroup['id'],
	options?: {
		maxAge?: number;
	}
): Promise<ArticleHeadingWithUserData[]> {
	const group = await getFeedGroupWithFeeds(feedGroupId);
	const feedIds = group?.feeds.map(({ id }) => id) ?? [];
	return getArticleHeadings(userId, {
		feedIds,
		maxAge: options?.maxAge
	});
}

export async function getSavedArticleHeadings(
	userId: User['id']
): Promise<ArticleHeadingWithUserData[]> {
	return db
		.selectFrom('article')
		.leftJoin('user_article', (join) =>
			join
				.onRef('user_article.article_id', '=', 'article.id')
				.on('user_article.user_id', '=', userId)
		)
		.select([
			'id',
			'feed_id',
			'article.article_id',
			'title',
			'link',
			'published',
			'read',
			'saved'
		])
		.where('saved', '=', 1)
		.orderBy('published', 'asc')
		.execute();
}

async function markArticle(
	d: typeof db | Transaction<Database>,
	{
		id,
		userId,
		userData
	}: {
		id: Article['id'];
		userId: User['id'];
		userData: ArticleUserData;
	}
): Promise<UserArticle | undefined> {
	return d
		.insertInto('user_article')
		.values({
			user_id: userId,
			article_id: id,
			...userData
		})
		.onConflict((conflict) =>
			conflict.columns(['user_id', 'article_id']).doUpdateSet(userData)
		)
		.returningAll()
		.executeTakeFirst();
}

export async function markArticles({
	articleIds,
	userId,
	userData
}: {
	articleIds: Article['id'][];
	userId: User['id'];
	userData: {
		read?: boolean;
		saved?: boolean;
	};
}): Promise<UserArticle[]> {
	const data: ArticleUserData = {};
	if (userData.read !== undefined) {
		data.read = userData.read ? 1 : 0;
	}
	if (userData.saved !== undefined) {
		data.saved = userData.saved ? 1 : 0;
	}

	const updates = await Promise.all(
		articleIds.map((id) => markArticle(db, { userId, id, userData: data }))
	);
	return updates.filter(isDefined);
}

type ArticleUpsert = Pick<
	Article,
	'article_id' | 'feed_id' | 'content' | 'title' | 'link' | 'published'
>;

export async function upsertArticle(data: ArticleUpsert): Promise<void> {
	await db
		.insertInto('article')
		.values({
			id: createId(),
			...data
		})
		.onConflict((conflict) =>
			conflict.columns(['article_id', 'feed_id']).doUpdateSet({
				content: data.content,
				title: data.title,
				link: data.link,
				published: data.published
			})
		)
		.executeTakeFirst();
}

export async function deleteArticles(
	articleIds: Article['id'][]
): Promise<void> {
	await db
		.deleteFrom('article')
		.where('article_id', 'in', articleIds)
		.executeTakeFirst();
}

export async function deleteFeedArticles(feedId: Feed['id']): Promise<void> {
	await db
		.deleteFrom('article')
		.where('feed_id', '=', feedId)
		.executeTakeFirst();
}
