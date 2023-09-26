import { error, type Cookies } from '@sveltejs/kit';
import {
	getSessionWithUser,
	type Session,
	type SessionWithUser
} from './db/session';
import type { User } from './db/user';

export function getSessionOrThrow(locals: App.Locals): SessionWithUser {
	const { session } = locals;
	if (!session) {
		throw error(401, 'not logged in');
	}
	return session;
}

export function getUserOrThrow(locals: App.Locals): User {
	const { user } = getSessionOrThrow(locals);
	return user;
}

export async function getSession(
	cookies: Cookies
): Promise<SessionWithUser | undefined> {
	const sessionId = cookies.get('session');
	return sessionId ? getSessionWithUser(sessionId) : undefined;
}

export function clearSessionCookie(cookies: Cookies): void {
	cookies.set('session', '', {
		path: '/',
		expires: new Date(0)
	});
}

export function setSessionCookie(
	cookies: Cookies,
	session: Pick<Session, 'id' | 'expires'>
): void {
	cookies.set('session', session.id, {
		path: '/',
		httpOnly: true,
		sameSite: 'strict',
		secure: process.env.NODE_ENV === 'production',
		maxAge: 60 * 60 * 24 * 7
	});
}
