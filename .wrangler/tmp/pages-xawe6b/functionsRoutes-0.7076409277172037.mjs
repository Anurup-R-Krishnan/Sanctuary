import { onRequestGet as __api_v2_me_ts_onRequestGet } from "/home/anuruprkris/Project/sanctuary-book-reader/functions/api/v2/me.ts"
import { onRequest as __api_v2_goals_ts_onRequest } from "/home/anuruprkris/Project/sanctuary-book-reader/functions/api/v2/goals.ts"
import { onRequest as __api_v2_library_ts_onRequest } from "/home/anuruprkris/Project/sanctuary-book-reader/functions/api/v2/library.ts"
import { onRequest as __api_v2_sessions_ts_onRequest } from "/home/anuruprkris/Project/sanctuary-book-reader/functions/api/v2/sessions.ts"
import { onRequest as __api_v2_settings_ts_onRequest } from "/home/anuruprkris/Project/sanctuary-book-reader/functions/api/v2/settings.ts"
import { onRequest as __api_content__id__ts_onRequest } from "/home/anuruprkris/Project/sanctuary-book-reader/functions/api/content/[id].ts"

export const routes = [
    {
      routePath: "/api/v2/me",
      mountPath: "/api/v2",
      method: "GET",
      middlewares: [],
      modules: [__api_v2_me_ts_onRequestGet],
    },
  {
      routePath: "/api/v2/goals",
      mountPath: "/api/v2",
      method: "",
      middlewares: [],
      modules: [__api_v2_goals_ts_onRequest],
    },
  {
      routePath: "/api/v2/library",
      mountPath: "/api/v2",
      method: "",
      middlewares: [],
      modules: [__api_v2_library_ts_onRequest],
    },
  {
      routePath: "/api/v2/sessions",
      mountPath: "/api/v2",
      method: "",
      middlewares: [],
      modules: [__api_v2_sessions_ts_onRequest],
    },
  {
      routePath: "/api/v2/settings",
      mountPath: "/api/v2",
      method: "",
      middlewares: [],
      modules: [__api_v2_settings_ts_onRequest],
    },
  {
      routePath: "/api/content/:id",
      mountPath: "/api/content",
      method: "",
      middlewares: [],
      modules: [__api_content__id__ts_onRequest],
    },
  ]