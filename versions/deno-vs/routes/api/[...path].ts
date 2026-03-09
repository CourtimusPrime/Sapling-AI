import { define } from "../../utils.ts";
import { api } from "../../api/app.ts";

export const handler = define.handlers((ctx) => api.fetch(ctx.req));
