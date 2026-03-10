import { define } from "../utils.ts";

export const handler = define.handlers({
  GET: () =>
    new Response(null, { status: 302, headers: { Location: "/main" } }),
});
