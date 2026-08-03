import "@servicenow/sdk/global";
import { Record } from "@servicenow/sdk/core";

Record({
  $id: Now.ID["gcmdb-config-default-root-ci"],
  table: "x_tusm_gcmdb_config",
  data: {
    x_tusm_gcmdb_setting_name: "default_root_ci",
    x_tusm_gcmdb_setting_value: "CAROL3-GATEWAY",
    x_tusm_gcmdb_active: true,
  },
});

Record({
  $id: Now.ID["gcmdb-config-max-depth"],
  table: "x_tusm_gcmdb_config",
  data: {
    x_tusm_gcmdb_setting_name: "max_depth",
    x_tusm_gcmdb_setting_value: "2",
    x_tusm_gcmdb_active: true,
  },
});

Record({
  $id: Now.ID["gcmdb-config-max-nodes"],
  table: "x_tusm_gcmdb_config",
  data: {
    x_tusm_gcmdb_setting_name: "max_nodes",
    x_tusm_gcmdb_setting_value: "250",
    x_tusm_gcmdb_active: true,
  },
});

Record({
  $id: Now.ID["gcmdb-config-gesture-confidence-threshold"],
  table: "x_tusm_gcmdb_config",
  data: {
    x_tusm_gcmdb_setting_name: "gesture_confidence_threshold",
    x_tusm_gcmdb_setting_value: "0.7",
    x_tusm_gcmdb_active: true,
  },
});
