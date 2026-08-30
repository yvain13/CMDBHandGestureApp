import "@servicenow/sdk/global";
import { Acl } from "@servicenow/sdk/core";

export const configRead = Acl({
  $id: Now.ID["gcmdb-config-read"],
  type: "record",
  table: "x_1433234_gcmdb_config",
  operation: "read",
  roles: ["itil", "admin"],
});

export const configWrite = Acl({
  $id: Now.ID["gcmdb-config-write"],
  type: "record",
  table: "x_1433234_gcmdb_config",
  operation: "write",
  roles: ["admin"],
});

export const restExecute = Acl({
  $id: Now.ID["gcmdb-rest-execute"],
  type: "rest_endpoint",
  name: "gesture_cmdb",
  operation: "execute",
  roles: ["itil"],
});
