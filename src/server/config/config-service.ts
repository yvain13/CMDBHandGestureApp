import { GlideRecord } from "@servicenow/glide";

export function getConfigValue(settingName: string): string {
  const gr = new GlideRecord("x_1433234_gcmdb_config");
  gr.addQuery("x_1433234_gcmdb_setting_name", settingName);
  gr.addQuery("x_1433234_gcmdb_active", true);
  gr.setLimit(1);
  gr.query();
  if (gr.next()) {
    return String(gr.getValue("x_1433234_gcmdb_setting_value") || "");
  }
  return "";
}
