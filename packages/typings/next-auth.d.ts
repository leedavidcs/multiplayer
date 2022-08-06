import NextAuth from "next-auth"

declare module "next-auth" {
	/**
	 * Returned by `useSession`, `getSession` and received as a prop on the `SessionProvider` React Context
	 */
	interface Session {
		user: {
			id: string,
			name: string;
			email: string;
			image: string | null | undefined;
			accessToken?: string | null | undefined;
		}
		accessToken: string;
		expires: string;
	}

	interface Profile {
		id: string;
		name: string;
		email: string;
		description?: string | null | undefined;
		image: string;
	}

	interface User {
		id: string;
		name: string;
		email: string;
		description?: string | null | undefined;
		image: string;
	}
}

declare module "next-auth/react" {
	interface User {
		id: string;
		name: string;
		email: string;
		description?: string | null | undefined;
		image: string;
	}
}

declare module "next-auth/jwt" {
	/**
	 * Returned by `getToken`
	 */
	interface JWT {
		name: string;
		email: string;
		picture?: Maybe<string>;
		sub: string;
		accessToken: string;
	}
}
