import * as db from './lib/db.js';
import type { Session, User } from './schema';
import cuid from 'cuid';

export type SessionWithUser = Session & {
	user: User;
};

export type ArticleFilter = 'all' | 'unread' | 'saved';

export type SessionData = {
	articleFilter: ArticleFilter;
};

export const defaultSessionData: SessionData = {
	articleFilter: 'unread'
};

export function createUserSession(userId: User['id']): Session {
	const expires = Number(new Date(Date.now() + 1000 * 60 * 60 * 24 * 7));
	const session = db
		.prepare<[Session['id'], Session['expires'], Session['userId'], string]>(
			`INSERT INTO Session (id, expires, userId, data)
			VALUES (?, ?, ?, ?)
			RETURNING *`
		)
		.get<Session>(cuid(), expires, userId, JSON.stringify(defaultSessionData));
	if (!session) {
		throw new Error('Unable to create session');
	}
	return session;
}

export function getSessionWithUser(id: Session['id']): SessionWithUser {
	const session = db
		.prepare<Session['id']>('SELECT * FROM Session WHERE id = ?')
		.get<Session>(id);
	if (!session) {
		throw new Error(`No session with ID ${id}`);
	}

	const user = db
		.prepare<User['id']>('SELECT * FROM User WHERE id = ?')
		.get<User>(session.userId);
	if (!user) {
		throw new Error(`No user for session ${id}`);
	}

	return {
		...session,
		user
	};
}

export function setSessionData(id: Session['id'], data: SessionData): void {
	db.prepare<[string, Session['id']]>(
		'UPDATE Session SET data = ? WHERE id = ?'
	).run(JSON.stringify(data), id);
}

export function deleteSession(id: Session['id']): void {
	db.prepare<Session['id']>('DELETE FROM Session WHERE id = ?').run(id);
}
