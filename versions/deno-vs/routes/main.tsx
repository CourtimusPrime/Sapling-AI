import SettingsPanel from "../islands/SettingsPanel.tsx";
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
      <div class="flex min-h-screen flex-col bg-gray-50">
        <header class="flex items-center justify-between border-b border-gray-200 bg-white px-6 py-3 shadow-sm">
          <h1 class="text-lg font-bold text-gray-900">Sapling</h1>
          <div class="flex items-center gap-3">
            <span class="text-sm text-gray-500">{user.email}</span>
            <SettingsPanel />
          </div>
        </header>
        <main class="flex flex-1 items-center justify-center">
          <p class="text-gray-400">Select or create a chat to get started.</p>
        </main>
      </div>,
    );
  },
});
