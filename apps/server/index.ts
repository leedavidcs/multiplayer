import { createRouter, DurableObjectUtils } from "@package/wrangler-utils";

export { RoomDurableObject } from "./durable-objects";

const router = createRouter<Env>()
	.path("/api/room", async (params, request, env) => {
		if (request.method !== "POST") {
			return new Response("Method not allowed", { status: 405 });
		}

		const roomId = env.rooms.newUniqueId();

		return new Response(roomId.toString(), {
			headers: { "access-control-allow-origin": "*" }
		});
	})
	.path("/api/room/:name", async ({ name }, request, env) => {
		const roomId = DurableObjectUtils.isValidId(name)
			? env.rooms.idFromString(name)
			: DurableObjectUtils.isValidName(name)
			? env.rooms.idFromName(name)
			: null;

		if (!roomId) return new Response("Name too long", { status: 404 });

		const room = env.rooms.get(roomId);

		const newUrl = `/${new URL(request.url).pathname
			.split("/")
			.slice(2)
			.join("/")
			.toString()}`;

		return room.fetch(newUrl, request);
	});


const worker: ExportedHandler<Env> = {
	async fetch(request: Request, env: Env): Promise<Response> {
		return router.match(request, env);
	}
};
