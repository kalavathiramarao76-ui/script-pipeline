// AI Provider abstraction - supports multiple AI backends

export interface AISettings {
  provider: 'openai' | 'anthropic' | 'grok' | 'custom';
  apiKey: string;
  model: string;
  baseUrl?: string; // for custom providers
  temperature?: number;
  maxTokens?: number;
}

const DEFAULT_SETTINGS: AISettings = {
  provider: 'grok',
  apiKey: '',
  model: 'grok-3',
  temperature: 0.7,
  maxTokens: 4096,
};

export function getProviderDefaults(provider: string): Partial<AISettings> {
  switch (provider) {
    case 'openai':
      return { model: 'gpt-4o', baseUrl: 'https://api.openai.com/v1' };
    case 'anthropic':
      return { model: 'claude-sonnet-4-20250514', baseUrl: 'https://api.anthropic.com/v1' };
    case 'grok':
      return { model: 'grok-3', baseUrl: 'https://api.x.ai/v1' };
    case 'custom':
      return { model: '', baseUrl: '' };
    default:
      return {};
  }
}

export async function callAI(
  settings: AISettings,
  systemPrompt: string,
  userPrompt: string,
): Promise<string> {
  const { provider, apiKey, model, baseUrl, temperature = 0.7, maxTokens = 4096 } = settings;

  if (!apiKey) {
    throw new Error(`No API key configured for provider: ${provider}. Please go to Settings to configure your AI provider.`);
  }

  if (provider === 'anthropic') {
    return callAnthropic(apiKey, model, systemPrompt, userPrompt, temperature, maxTokens);
  }

  // OpenAI-compatible API (works for OpenAI, Grok/xAI, and most custom providers)
  const url = `${baseUrl || getDefaultBaseUrl(provider)}/chat/completions`;

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      temperature,
      max_tokens: maxTokens,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`AI API error (${response.status}): ${error}`);
  }

  const data = await response.json();
  return data.choices?.[0]?.message?.content || '';
}

async function callAnthropic(
  apiKey: string,
  model: string,
  systemPrompt: string,
  userPrompt: string,
  temperature: number,
  maxTokens: number,
): Promise<string> {
  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model,
      max_tokens: maxTokens,
      temperature,
      system: systemPrompt,
      messages: [{ role: 'user', content: userPrompt }],
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Anthropic API error (${response.status}): ${error}`);
  }

  const data = await response.json();
  return data.content?.[0]?.text || '';
}

function getDefaultBaseUrl(provider: string): string {
  switch (provider) {
    case 'openai': return 'https://api.openai.com/v1';
    case 'grok': return 'https://api.x.ai/v1';
    default: return '';
  }
}

export { DEFAULT_SETTINGS };
