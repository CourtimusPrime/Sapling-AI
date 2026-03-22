import ChatPanel from "../islands/ChatPanel.tsx";
import ChatSidebar from "../islands/ChatSidebar.tsx";
import Mindmap from "../islands/Mindmap.tsx";
import SettingsPanel from "../islands/SettingsPanel.tsx";
import { define } from "../utils.ts";

export const handler = define.handlers({
  GET: (ctx) => {
    return ctx.render(
      <div class="flex h-screen flex-col bg-white">
        <header class="flex flex-shrink-0 items-center justify-between border-b border-neutral-200 bg-white px-5 py-2.5">
          <span class="text-[15px] font-semibold tracking-tight text-black">Sapling</span>
          <SettingsPanel />
        </header>

        <div class="flex flex-1 overflow-hidden">
          <ChatSidebar />

          <section class="flex h-full flex-1 flex-col border-r border-neutral-200 bg-white">
            <ChatPanel />
          </section>

          <section class="h-full w-[38%] bg-neutral-50 p-3">
            <Mindmap />
          </section>
        </div>
      </div>,
    );
  },
});
