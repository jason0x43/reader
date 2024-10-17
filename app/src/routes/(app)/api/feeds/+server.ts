import { Api } from "$lib/api.server";
import { AddFeedRequest } from "@jason0x43/reader-types";

export async function POST({ request, fetch, locals }) {
	const data = AddFeedRequest.parse(await request.json());
	const api = new Api({ fetch, sessionId: locals.sessionId });
	await api.createFeed(data);

	return new Response("OK");
}
