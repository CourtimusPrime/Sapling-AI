import AuthForm from "../islands/AuthForm.tsx";
import { getAuthUser } from "../lib/auth.ts";
import { define } from "../utils.ts";

export const handler = define.handlers({
  GET: async (ctx) => {
    const user = await getAuthUser(ctx.req);
    if (user) {
      return new Response(null, {
        status: 302,
        headers: { Location: "/main" },
      });
    }
    return ctx.render(<AuthForm />);
  },
});
