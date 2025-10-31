import { initTRPC } from "@trpc/server";
import { chatRouter } from "./routers/chat.router";
import { searchRouter } from "./routers/search.router";
import { userRouter } from "./routers/user.router";

const t = initTRPC.create();

export const router = t.router;
export const publicProcedure = t.procedure;

export const app = router({
  chat: chatRouter,
  search: searchRouter,
  user: userRouter,
});

export type AppRouter = typeof app;

