import { describe, expect, it } from "vitest";
import { interviewProfileJsonSchema } from "./run";

function schemaUsesMinOrMaxItems(value: unknown, path = ""): string[] {
  if (!value || typeof value !== "object") return [];
  const hits: string[] = [];
  if (Array.isArray(value)) {
    for (let i = 0; i < value.length; i++) hits.push(...schemaUsesMinOrMaxItems(value[i], `${path}[${i}]`));
    return hits;
  }
  const obj = value as Record<string, unknown>;
  for (const key of Object.keys(obj)) {
    const next = `${path}.${key}`.replace(/^\./, "");
    if (key === "minItems" || key === "maxItems") hits.push(next || key);
    hits.push(...schemaUsesMinOrMaxItems(obj[key], next));
  }
  return hits;
}

describe("interviewProfileJsonSchema", () => {
  it("does not use minItems or maxItems (unsupported by Claude json_schema)", () => {
    const schema = interviewProfileJsonSchema();
    expect(schemaUsesMinOrMaxItems(schema)).toEqual([]);
  });

  it("still describes goals as a string array", () => {
    const schema = interviewProfileJsonSchema() as {
      properties: { goals: { type: string; items: { type: string } } };
    };
    expect(schema.properties.goals).toEqual({ type: "array", items: { type: "string" } });
  });
});
