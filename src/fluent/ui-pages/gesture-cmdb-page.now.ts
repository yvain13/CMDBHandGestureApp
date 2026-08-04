// src/fluent/ui-pages/gesture-cmdb-page.now.ts
import "@servicenow/sdk/global";
import { UiPage } from "@servicenow/sdk/core";
import page from "../../client/index.html";

export const gestureCmdbPage = UiPage({
  $id: Now.ID["gesture-cmdb-page"],
  endpoint: "x_tusm_gcmdb_page.do",
  html: page,
  direct: true,
});
