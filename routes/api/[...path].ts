import { api } from "../../api/app.ts";
import { define } from "../../utils.ts";

export const handler = define.handlers((ctx) => api.fetch(ctx.req));
