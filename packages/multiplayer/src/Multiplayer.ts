export class Multiplayer {
	public static onMessage<TEvent extends string>(event: TEvent) {

	}
}

export const createMultiplayer = () => {
	return new Multiplayer();
};
