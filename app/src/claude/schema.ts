/**
 * Structured outputs accept a subset of JSON Schema: every object needs
 * `additionalProperties: false`, and array constraints other than
 * minItems 0/1 are rejected. The engine's schemas are written for meaning,
 * so adapt them here. Anything removed is checked again in validate.ts.
 */
const UNSUPPORTED = new Set(['maxItems', 'minLength', 'maxLength', 'minimum', 'maximum', 'multipleOf']);

export function toStructuredOutputSchema(schema: unknown): Record<string, unknown> {
  return strict(schema) as Record<string, unknown>;
}

function strict(node: unknown): unknown {
  if (Array.isArray(node)) return node.map(strict);
  if (typeof node !== 'object' || node === null) return node;
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(node)) {
    if (UNSUPPORTED.has(k)) continue;
    if (k === 'minItems' && typeof v === 'number' && v > 1) continue;
    out[k] = k === 'properties' ? mapValues(v as Record<string, unknown>) : strict(v);
  }
  if (out.type === 'object') out.additionalProperties = false;
  return out;
}

function mapValues(props: Record<string, unknown>) {
  return Object.fromEntries(Object.entries(props).map(([k, v]) => [k, strict(v)]));
}
