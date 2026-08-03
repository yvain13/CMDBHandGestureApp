import "@servicenow/sdk/global";
import { Record } from "@servicenow/sdk/core";

const settings = [
  { key: "default-root-ci", name: "default_root_ci", value: "CAROL3-GATEWAY" },
  { key: "max-depth", name: "max_depth", value: "2" },
  { key: "max-nodes", name: "max_nodes", value: "250" },
  { key: "gesture-confidence-threshold", name: "gesture_confidence_threshold", value: "0.7" },
];

settings.forEach((setting) => {
  Record({
    $id: Now.ID[`gcmdb-config-${setting.key}`],
    table: "x_tusm_gcmdb_config",
    data: {
      x_tusm_gcmdb_setting_name: setting.name,
      x_tusm_gcmdb_setting_value: setting.value,
      x_tusm_gcmdb_active: true,
    },
  });
});
