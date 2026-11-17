import Anthropic from '@anthropic-ai/sdk';
import { describe, expect, it, vi } from 'vitest';
import { DISH_RECOGNITION_SCHEMA, LABEL_EXTRACTION_SCHEMA, assessLabel, extractionToText } from '@glutenlens/engine';
import { MODEL, createClient, describeError } from '../src/claude/client.ts';
import {
  CONNECTION_STORAGE_KEY,
  EMPTY_CONNECTION,
  connectionProblem,
  loadConnection,
  maskKey,
  parseConnection,
  saveConnection,
} from '../src/claude/connection.ts';
import { fitWithin } from '../src/claude/image.ts';
import { toStructuredOutputSchema } from '../src/claude/schema.ts';
import { InvalidModelOutput, validateDishRecognition, validateLabelExtraction } from '../src/claude/validate.ts';
import { ModelDeclined, estimateDishIngredients, extractLabel, recognizeDish } from '../src/claude/vision.ts';

const IMG = { mediaType: 'image/jpeg' as const, data: 'AAAA', width: 10, height: 10 };

const GOOD_LABEL = {
  ingredientsText: 'Rice flour, sugar, barley malt extract',
  statements: ['May contain traces of wheat.'],
  language: 'EN',
  confidence: 'high',
  ingredientsFound: true,
  certificationMark: false,
};

/** A stand-in client that records the request and returns `reply`. */
function fakeClient(reply: Partial<Anthropic.Beta.BetaMessage> & { text?: string }) {
  const create = vi.fn(async () => ({
    stop_reason: 'end_turn',
    content: reply.text === undefined ? [] : [{ type: 'text', text: reply.text }],
    ...reply,
  }));
  return { client: { beta: { messages: { create } } } as unknown as Anthropic, create };
}

describe('connection settings', () => {
  const mem = () => {
    const m = new Map<string, string>();
    return { getItem: (k: string) => m.get(k) ?? null, setItem: (k: string, v: string) => void m.set(k, v), removeItem: (k: string) => void m.delete(k), m };
  };

  it('starts empty and round-trips', () => {
    const s = mem();
    expect(loadConnection(s)).toEqual(EMPTY_CONNECTION);
    const c = { mode: 'proxy' as const, apiKey: '', proxyUrl: 'https://p.example.dev', accessCode: 'abc' };
    expect(saveConnection(c, s)).toBe(true);
    expect(loadConnection(s)).toEqual(c);
    expect(s.m.has(CONNECTION_STORAGE_KEY)).toBe(true);
  });

  it('survives corrupt storage', () => {
    expect(parseConnection('{')).toEqual(EMPTY_CONNECTION);
    expect(parseConnection('{"mode":"weird","apiKey":5}')).toEqual(EMPTY_CONNECTION);
  });

  it('explains what is missing', () => {
    expect(connectionProblem(EMPTY_CONNECTION)).toMatch(/API key/);
    expect(connectionProblem({ ...EMPTY_CONNECTION, apiKey: 'hello' })).toMatch(/sk-ant-/);
    expect(connectionProblem({ ...EMPTY_CONNECTION, apiKey: 'sk-ant-api03-xyz' })).toBeNull();
    const proxy = { ...EMPTY_CONNECTION, mode: 'proxy' as const };
    expect(connectionProblem({ ...proxy, proxyUrl: 'http://p.example.dev', accessCode: 'x' })).toMatch(/https/);
    expect(connectionProblem({ ...proxy, proxyUrl: 'http://localhost:8787', accessCode: 'x' })).toBeNull();
    expect(connectionProblem({ ...proxy, proxyUrl: 'https://p.example.dev' })).toMatch(/access code/);
  });

  it('masks keys', () => {
    expect(maskKey('sk-ant-api03-abcdefghijklmnop')).toBe('sk-ant-…mnop');
    expect(maskKey('short')).toBe('••••');
  });
});

describe('client', () => {
  it('points proxy mode at the proxy with the access code', () => {
    const c = createClient({ mode: 'proxy', apiKey: 'sk-ant-ignored', proxyUrl: 'https://p.example.dev/', accessCode: 'code' });
    expect(c.baseURL).toBe('https://p.example.dev');
    expect(c.apiKey).toBe('code');
  });

  it('uses the stored key in key mode', () => {
    const c = createClient({ ...EMPTY_CONNECTION, apiKey: 'sk-ant-k' });
    expect(c.apiKey).toBe('sk-ant-k');
    expect(c.baseURL).toBe('https://api.anthropic.com');
  });

  it('turns API errors into plain language', () => {
    const h = new Headers();
    expect(describeError(new Anthropic.AuthenticationError(401, undefined, 'x', h))).toMatch(/rejected/);
    expect(describeError(new Anthropic.RateLimitError(429, undefined, 'x', h))).toMatch(/Too many/);
    expect(describeError(new Anthropic.APIConnectionError({ message: 'x' }))).toMatch(/internet/);
  });
});

describe('structured output schema', () => {
  it('adds additionalProperties:false to every object and drops unsupported constraints', () => {
    const s = toStructuredOutputSchema(DISH_RECOGNITION_SCHEMA) as any;
    expect(s.additionalProperties).toBe(false);
    expect(s.properties.candidates.maxItems).toBeUndefined();
    expect(s.properties.candidates.items.additionalProperties).toBe(false);
    expect(s.properties.candidates.items.required).toEqual(['name', 'confidence']);
    const l = toStructuredOutputSchema(LABEL_EXTRACTION_SCHEMA) as any;
    expect(l.properties.confidence.enum).toEqual(['high', 'medium', 'low']);
    expect(JSON.stringify(l)).not.toMatch(/maxItems|minLength/);
  });

  it('does not change the engine schema', () => {
    toStructuredOutputSchema(DISH_RECOGNITION_SCHEMA);
    expect((DISH_RECOGNITION_SCHEMA.properties.candidates as any).maxItems).toBe(5);
  });
});

describe('model output validation', () => {
  it('accepts a good label and normalises the language code', () => {
    expect(validateLabelExtraction(GOOD_LABEL).language).toBe('en');
  });

  it('never fills in a missing or unknown confidence', () => {
    const { confidence: _c, ...noConf } = GOOD_LABEL;
    expect(() => validateLabelExtraction(noConf)).toThrow(InvalidModelOutput);
    expect(() => validateLabelExtraction({ ...GOOD_LABEL, confidence: 'certain' })).toThrow(InvalidModelOutput);
  });

  it('rejects wrong types', () => {
    expect(() => validateLabelExtraction({ ...GOOD_LABEL, ingredientsFound: 'yes' })).toThrow(InvalidModelOutput);
    expect(() => validateLabelExtraction({ ...GOOD_LABEL, statements: 'May contain wheat' })).toThrow(InvalidModelOutput);
    expect(() => validateLabelExtraction(null)).toThrow(InvalidModelOutput);
  });

  it('ignores extra fields such as a model-made verdict', () => {
    const out = validateLabelExtraction({ ...GOOD_LABEL, verdict: 'gluten_free_claim', glutenFree: true }) as any;
    expect(out.verdict).toBeUndefined();
    expect(out.glutenFree).toBeUndefined();
  });

  it('caps dish candidates at five and trims names', () => {
    const candidates = Array.from({ length: 7 }, (_, i) => ({ name: ` Dish ${i} `, confidence: 'low' }));
    const out = validateDishRecognition({ candidates });
    expect(out.candidates).toHaveLength(5);
    expect(out.candidates[0]!.name).toBe('Dish 0');
    expect(() => validateDishRecognition({ candidates: [{ name: '', confidence: 'high' }] })).toThrow(InvalidModelOutput);
  });
});

describe('vision calls', () => {
  it('sends the label photo with the engine prompt and a strict schema', async () => {
    const { client, create } = fakeClient({ text: JSON.stringify(GOOD_LABEL) });
    const e = await extractLabel(client, IMG);
    const body = (create.mock.calls[0] as any)[0];
    expect(body.model).toBe(MODEL);
    expect(body.system).toMatch(/transcribing a food package label/);
    expect(body.output_config.format.type).toBe('json_schema');
    expect(body.output_config.format.schema.additionalProperties).toBe(false);
    expect(body.fallbacks).toBe('default');
    expect(body.betas).toContain('server-side-fallback-2026-07-01');
    expect(body.messages[0].content[0]).toEqual({ type: 'image', source: { type: 'base64', media_type: 'image/jpeg', data: 'AAAA' } });
    expect(body.thinking).toBeUndefined();

    // The engine, not the model, gives the verdict.
    const r = assessLabel({
      text: extractionToText(e),
      region: 'AU',
      language: e.language,
      certificationMark: e.certificationMark,
      extraction: { confidence: e.confidence, userConfirmed: true, ingredientsFound: e.ingredientsFound },
    });
    expect(r.verdict).toBe('contains_gluten');
  });

  it('reports a refusal instead of returning data', async () => {
    const { client } = fakeClient({ stop_reason: 'refusal', text: '' });
    await expect(extractLabel(client, IMG)).rejects.toBeInstanceOf(ModelDeclined);
  });

  it('reports truncated or unreadable replies', async () => {
    await expect(extractLabel(fakeClient({ stop_reason: 'max_tokens', text: '{"ingr' }).client, IMG)).rejects.toBeInstanceOf(InvalidModelOutput);
    await expect(extractLabel(fakeClient({ text: 'not json' }).client, IMG)).rejects.toBeInstanceOf(InvalidModelOutput);
  });

  it('asks for dish names from a photo and ingredients for a typed name', async () => {
    const reply = { text: JSON.stringify({ candidates: [{ name: 'Pad thai', confidence: 'high' }], typicalIngredients: ['rice noodles', 'fish sauce'] }) };
    const a = fakeClient(reply);
    await recognizeDish(a.client, IMG);
    expect((a.create.mock.calls[0] as any)[0].messages[0].content[0].type).toBe('image');

    const b = fakeClient(reply);
    const est = await estimateDishIngredients(b.client, 'Pad see ew');
    const content = (b.create.mock.calls[0] as any)[0].messages[0].content;
    expect(content).toHaveLength(1);
    expect(content[0].text).toContain('Pad see ew');
    expect(est.typicalIngredients).toEqual(['rice noodles', 'fish sauce']);
  });
});

describe('image sizing', () => {
  it('keeps small photos and scales big ones to the 2576 px long edge', () => {
    expect(fitWithin(1000, 800)).toEqual({ width: 1000, height: 800 });
    expect(fitWithin(4032, 3024)).toEqual({ width: 2576, height: 1932 });
    expect(fitWithin(3024, 4032)).toEqual({ width: 1932, height: 2576 });
  });
});
