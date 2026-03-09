import { getAuthUser } from "../lib/auth.ts";
import { define } from "../utils.ts";

export const handler = define.handlers({
  GET: async (ctx) => {
    const user = await getAuthUser(ctx.req);
    if (!user) {
      return new Response(null, {
        status: 302,
        headers: { Location: "/auth" },
      });
    }
    return ctx.render(
      <div class="flex min-h-screen flex-col items-center justify-center bg-gray-50">
        <div class="rounded-lg bg-white p-8 shadow-md">
          <h1 class="text-2xl font-bold text-gray-900">Sapling</h1>
          <p class="mt-2 text-gray-600">Welcome, {user.email}. More coming soon.</p>
        </div>
      </div>,
    );
  },
});
