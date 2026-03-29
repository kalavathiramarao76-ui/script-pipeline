import { NextRequest, NextResponse } from 'next/server';
import { loadSettings, saveSettings } from '@/lib/settings-store';

export async function GET() {
  const settings = await loadSettings();
  // Mask the API key for security
  return NextResponse.json({
    ...settings,
    apiKey: settings.apiKey ? '••••' + settings.apiKey.slice(-8) : '',
    hasKey: !!settings.apiKey,
  });
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const current = await loadSettings();

  const updated = {
    provider: body.provider || current.provider,
    apiKey: body.apiKey === undefined || body.apiKey?.startsWith('••••') ? current.apiKey : body.apiKey,
    model: body.model || current.model,
    baseUrl: body.baseUrl ?? current.baseUrl,
    temperature: body.temperature ?? current.temperature,
    maxTokens: body.maxTokens ?? current.maxTokens,
  };

  await saveSettings(updated);
  return NextResponse.json({ success: true });
}
