/** Safe access to the untyped JSON blobs (`meta.planted` etc.) served by the API. */
export type JsonObject = Record<string, unknown>;

export function asObject(v: unknown): JsonObject {
  return typeof v === "object" && v !== null && !Array.isArray(v) ? (v as JsonObject) : {};
}

export function num(o: unknown, key: string): number | null {
  const v = asObject(o)[key];
  return typeof v === "number" ? v : null;
}
