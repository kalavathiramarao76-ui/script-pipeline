// Server-side settings storage
// Uses /tmp on Vercel (serverless), or local file in dev

import { AISettings } from './ai-provider';
import { promises as fs } from 'fs';
import path from 'path';

const isVercel = process.env.VERCEL === '1';
const SETTINGS_FILE = isVercel
  ? '/tmp/settings.json'
  : path.join(process.cwd(), 'settings.json');

const DEFAULT: AISettings = {
  provider: process.env.AI_PROVIDER as AISettings['provider'] || 'grok',
  apiKey: process.env.AI_API_KEY || '',
  model: process.env.AI_MODEL || 'grok-3',
  baseUrl: process.env.AI_BASE_URL || 'https://api.x.ai/v1',
  temperature: parseFloat(process.env.AI_TEMPERATURE || '0.7'),
  maxTokens: parseInt(process.env.AI_MAX_TOKENS || '4096'),
};

export async function loadSettings(): Promise<AISettings> {
  try {
    const data = await fs.readFile(SETTINGS_FILE, 'utf-8');
    return { ...DEFAULT, ...JSON.parse(data) };
  } catch {
    return DEFAULT;
  }
}

export async function saveSettings(settings: AISettings): Promise<void> {
  await fs.writeFile(SETTINGS_FILE, JSON.stringify(settings, null, 2));
}
