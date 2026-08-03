import "@servicenow/sdk/global";
import { Table, StringColumn, BooleanColumn } from "@servicenow/sdk/core";

export const x_tusm_gcmdb_config = Table({
  name: "x_tusm_gcmdb_config",
  label: "Gesture CMDB Config",
  schema: {
    x_tusm_gcmdb_setting_name: StringColumn({
      label: "Setting Name",
      maxLength: 100,
      mandatory: true,
    }),
    x_tusm_gcmdb_setting_value: StringColumn({
      label: "Setting Value",
      maxLength: 255,
    }),
    x_tusm_gcmdb_active: BooleanColumn({
      label: "Active",
      default: true,
    }),
  },
  accessibleFrom: "package_private",
});
