import { createRouter, DurableObjectUtils } from "@package/wrangler-utils";

export { RoomDurableObject } from "./durable-objects";

interface Context {
	env: Env;
}

const router = createRouter<Context>()
	.path("post", "/api/room", async (params, { context: { env }, request }) => {
		if (request.method !== "POST") {
			return new Response("Method not allowed", { status: 405 });
		}

		const roomId = env.rooms.newUniqueId();

		return new Response(roomId.toString(), {
			headers: { "access-control-allow-origin": "*" }
		});
	})
	.path("post", "/api/room/:rest*", async ({ rest }, { request, context: { env } }) => {
		const [name, ...restPath] = rest;
		const forwardUrl = `/${restPath.join("/")}`;

		const roomId = DurableObjectUtils.isValidId(name)
			? env.rooms.idFromString(name)
			: DurableObjectUtils.isValidName(name)
			? env.rooms.idFromName(name)
			: null;

		if (!roomId) return new Response("Name too long", { status: 404 });

		const room = env.rooms.get(roomId);

		return room.fetch(forwardUrl, request);
	});

const worker: ExportedHandler<Env> = {
	async fetch(request: Request, env: Env): Promise<Response> {
		const context: Context = { env };

		return router
			.config({ context })
			.match(request);
	}
};
