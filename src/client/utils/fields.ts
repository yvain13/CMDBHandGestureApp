// src/client/utils/fields.ts
export const display = (field: any): string => {
  if (typeof field === "string") return field;
  return field?.display_value || "";
};

export const value = (field: any): string => {
  if (typeof field === "string") return field;
  return field?.value || "";
};
