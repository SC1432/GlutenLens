import type Anthropic from '@anthropic-ai/sdk';
import {
  DISH_RECOGNITION_PROMPT,
  DISH_RECOGNITION_SCHEMA,
  LABEL_EXTRACTION_PROMPT,
  LABEL_EXTRACTION_SCHEMA,
  type DishRecognition,
  type LabelExtraction,
} from '@glutenlens/engine';
import { MODEL } from './client.ts';
import type { PreparedImage } from './image.ts';
import { toStructuredOutputSchema } from './schema.ts';
import { InvalidModelOutput, validateDishRecognition, validateLabelExtraction } from './validate.ts';

/**
 * The model only transcribes labels and proposes dish names or recipes.
 * Verdicts come from the engine (CLAUDE.md rule 1); nothing here returns one.
 */

const LABEL_FORMAT = { type: 'json_schema', schema: toStructuredOutputSchema(LABEL_EXTRACTION_SCHEMA) } as const;
const DISH_FORMAT = { type: 'json_schema', schema: toStructuredOutputSchema(DISH_RECOGNITION_SCHEMA) } as const;

export class ModelDeclined extends Error {}

type Content = Anthropic.Beta.BetaContentBlockParam[];

async function structured(
  client: Anthropic,
  system: string,
  content: Content,
  format: typeof LABEL_FORMAT | typeof DISH_FORMAT,
  signal?: AbortSignal,
): Promise<unknown> {
  const res = await client.beta.messages.create(
    {
      model: MODEL,
      max_tokens: 16000,
      system,
      messages: [{ role: 'user', content }],
      output_config: { format, effort: 'medium' },
      // If a safety classifier declines, the API retries on another model in the same call.
      betas: ['server-side-fallback-2026-07-01'],
      fallbacks: 'default',
    },
    { signal },
  );
  if (res.stop_reason === 'refusal') throw new ModelDeclined('Claude declined to read this image. Try a clearer photo of just the label.');
  if (res.stop_reason === 'max_tokens') throw new InvalidModelOutput('The reply from Claude was cut off. Try again.');
  const text = res.content.flatMap((b) => (b.type === 'text' ? [b.text] : [])).join('');
  try {
    return JSON.parse(text);
  } catch {
    throw new InvalidModelOutput('The reply from Claude wasn’t readable. Try again.');
  }
}

function imageBlock(img: PreparedImage): Anthropic.Beta.BetaImageBlockParam {
  return { type: 'image', source: { type: 'base64', media_type: img.mediaType, data: img.data } };
}

/** Transcribe a food label photo. The user must still confirm the text. */
export async function extractLabel(client: Anthropic, img: PreparedImage, signal?: AbortSignal): Promise<LabelExtraction> {
  const json = await structured(
    client,
    LABEL_EXTRACTION_PROMPT,
    [imageBlock(img), { type: 'text', text: 'Transcribe this label.' }],
    LABEL_FORMAT,
    signal,
  );
  return validateLabelExtraction(json);
}

/** Propose names for the dish in a photo. */
export async function recognizeDish(client: Anthropic, img: PreparedImage, signal?: AbortSignal): Promise<DishRecognition> {
  const json = await structured(
    client,
    DISH_RECOGNITION_PROMPT,
    [imageBlock(img), { type: 'text', text: 'What dish is this? Do not list typical ingredients.' }],
    DISH_FORMAT,
    signal,
  );
  return validateDishRecognition(json);
}

/** Typical ingredients for a dish outside the knowledge base (result is an estimate). */
export async function estimateDishIngredients(client: Anthropic, dishName: string, signal?: AbortSignal): Promise<DishRecognition> {
  const json = await structured(
    client,
    DISH_RECOGNITION_PROMPT,
    [{ type: 'text', text: `Dish: ${dishName}\nGive this dish as the first candidate and list its typical ingredients.` }],
    DISH_FORMAT,
    signal,
  );
  return validateDishRecognition(json);
}
