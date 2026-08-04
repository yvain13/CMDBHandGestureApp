// src/fluent/menu/app-menu.now.ts
import "@servicenow/sdk/global";
import { ApplicationMenu, Record } from "@servicenow/sdk/core";

export const gcmdbMenu = ApplicationMenu({
  $id: Now.ID["gcmdb-app-menu"],
  title: "Touchless War Room",
  hint: "Gesture-controlled CMDB impact map",
  description: "Gesture-controlled CMDB impact map",
  roles: ["itil"],
  active: true,
});

export const gcmdbPageModule = Record({
  $id: Now.ID["gcmdb-page-module"],
  table: "sys_app_module",
  data: {
    title: "Gesture CMDB Map",
    application: gcmdbMenu,
    link_type: "DIRECT",
    query: "x_tusm_gcmdb_page.do",
    hint: "Camera features require opening this in its own browser tab, not this nav panel",
    roles: ["itil"],
    active: true,
    order: 100,
  },
});
