import OpenAI from 'openai';
import { RECONCILE_PROMPT } from './prompt';

export const ACCEPTED_MIME = new Set([
  'application/pdf', 'image/jpeg', 'image/jpg',
  'image/png', 'image/webp', 'image/gif',
]);

export function normalizeMime(m: string): string {
  return m === 'image/jpg' ? 'image/jpeg' : m;
}

export async function callOpenAI(base64: string, mimeType: string): Promise<string> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error('OPENAI_API_KEY não configurada.');
  const client = new OpenAI({ apiKey });
  const response = await client.chat.completions.create({
    model: 'gpt-4o',
    max_tokens: 4096,
    temperature: 0,
    messages: [
      { role: 'system', content: 'You are a precise OCR engine. When you cannot read a number clearly, write null — never write 0 as a placeholder.' },
      {
        role: 'user',
        content: [
          { type: 'image_url', image_url: { url: `data:${mimeType};base64,${base64}`, detail: 'high' } },
          { type: 'text', text: RECONCILE_PROMPT },
        ],
      },
    ],
  });
  const raw = response.choices[0]?.message?.content ?? '';
  if (!raw) throw new Error('OpenAI retornou resposta vazia.');
  if (response.choices[0]?.finish_reason === 'length') throw new Error('Resposta truncada pelo OpenAI (finish_reason=length).');
  return raw;
}
