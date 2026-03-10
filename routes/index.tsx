import { getAuthUser } from "../lib/auth.ts";
import { define } from "../utils.ts";

export const handler = define.handlers({
  GET: async (ctx) => {
    const user = await getAuthUser(ctx.req);
    return new Response(null, {
      status: 302,
      headers: { Location: user ? "/main" : "/auth" },
    });
  },
});
