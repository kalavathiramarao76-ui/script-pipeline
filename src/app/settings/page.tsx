'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

const PROVIDERS = [
  { id: 'grok', name: 'Grok (xAI)', models: ['grok-3', 'grok-3-mini', 'grok-2'], baseUrl: 'https://api.x.ai/v1' },
  { id: 'openai', name: 'OpenAI', models: ['gpt-4o', 'gpt-4o-mini', 'gpt-4-turbo', 'o1', 'o3-mini'], baseUrl: 'https://api.openai.com/v1' },
  { id: 'anthropic', name: 'Anthropic (Claude)', models: ['claude-sonnet-4-20250514', 'claude-opus-4-20250514', 'claude-haiku-4-5-20251001'], baseUrl: 'https://api.anthropic.com/v1' },
  { id: 'custom', name: 'Custom / Self-hosted', models: [], baseUrl: '' },
];

export default function SettingsPage() {
  const [provider, setProvider] = useState('grok');
  const [apiKey, setApiKey] = useState('');
  const [model, setModel] = useState('grok-3');
  const [baseUrl, setBaseUrl] = useState('https://api.x.ai/v1');
  const [temperature, setTemperature] = useState(0.7);
  const [maxTokens, setMaxTokens] = useState(4096);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [hasKey, setHasKey] = useState(false);

  useEffect(() => {
    fetch('/api/settings')
      .then(r => r.json())
      .then(data => {
        setProvider(data.provider || 'grok');
        setApiKey(data.apiKey || '');
        setModel(data.model || 'grok-3');
        setBaseUrl(data.baseUrl || '');
        setTemperature(data.temperature ?? 0.7);
        setMaxTokens(data.maxTokens ?? 4096);
        setHasKey(data.hasKey || false);
      });
  }, []);

  const selectedProvider = PROVIDERS.find(p => p.id === provider);

  function handleProviderChange(newProvider: string) {
    setProvider(newProvider);
    const p = PROVIDERS.find(pr => pr.id === newProvider);
    if (p) {
      setBaseUrl(p.baseUrl);
      if (p.models.length > 0) setModel(p.models[0]);
    }
  }

  async function handleSave() {
    setSaving(true);
    await fetch('/api/settings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ provider, apiKey, model, baseUrl, temperature, maxTokens }),
    });
    setSaving(false);
    setSaved(true);
    setHasKey(true);
    setTimeout(() => setSaved(false), 3000);
  }

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      <div className="max-w-2xl mx-auto p-8">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-2xl font-bold">AI Settings</h1>
          <Link href="/" className="text-blue-400 hover:text-blue-300 text-sm">
            Back to Pipeline
          </Link>
        </div>

        <div className="space-y-6">
          {/* Provider Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">AI Provider</label>
            <div className="grid grid-cols-2 gap-3">
              {PROVIDERS.map(p => (
                <button
                  key={p.id}
                  onClick={() => handleProviderChange(p.id)}
                  className={`p-3 rounded-lg border text-left transition ${
                    provider === p.id
                      ? 'border-blue-500 bg-blue-500/10 text-blue-300'
                      : 'border-gray-700 bg-gray-900 text-gray-400 hover:border-gray-500'
                  }`}
                >
                  <div className="font-medium">{p.name}</div>
                  {p.models.length > 0 && (
                    <div className="text-xs mt-1 opacity-60">{p.models[0]}</div>
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* API Key */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              API Key
              {hasKey && <span className="text-green-400 ml-2 text-xs">(configured)</span>}
            </label>
            <input
              type="password"
              value={apiKey}
              onChange={e => setApiKey(e.target.value)}
              placeholder="Enter your API key..."
              className="w-full px-4 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-blue-500"
            />
          </div>

          {/* Model */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Model</label>
            {selectedProvider && selectedProvider.models.length > 0 ? (
              <select
                value={model}
                onChange={e => setModel(e.target.value)}
                className="w-full px-4 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-blue-500"
              >
                {selectedProvider.models.map(m => (
                  <option key={m} value={m}>{m}</option>
                ))}
              </select>
            ) : (
              <input
                type="text"
                value={model}
                onChange={e => setModel(e.target.value)}
                placeholder="Model name (e.g., llama-3-70b)"
                className="w-full px-4 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-blue-500"
              />
            )}
          </div>

          {/* Base URL (for custom) */}
          {provider === 'custom' && (
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Base URL</label>
              <input
                type="text"
                value={baseUrl}
                onChange={e => setBaseUrl(e.target.value)}
                placeholder="https://your-api.com/v1"
                className="w-full px-4 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-blue-500"
              />
            </div>
          )}

          {/* Temperature */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Temperature: {temperature}
            </label>
            <input
              type="range"
              min="0"
              max="1"
              step="0.1"
              value={temperature}
              onChange={e => setTemperature(parseFloat(e.target.value))}
              className="w-full"
            />
            <div className="flex justify-between text-xs text-gray-500">
              <span>Focused (0)</span>
              <span>Creative (1)</span>
            </div>
          </div>

          {/* Max Tokens */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Max Tokens per Agent</label>
            <select
              value={maxTokens}
              onChange={e => setMaxTokens(parseInt(e.target.value))}
              className="w-full px-4 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-blue-500"
            >
              <option value={2048}>2,048</option>
              <option value={4096}>4,096</option>
              <option value={8192}>8,192</option>
              <option value={16384}>16,384</option>
            </select>
          </div>

          {/* Save Button */}
          <button
            onClick={handleSave}
            disabled={saving}
            className="w-full py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-800 rounded-lg font-medium transition"
          >
            {saving ? 'Saving...' : saved ? 'Saved!' : 'Save Settings'}
          </button>

          {saved && (
            <p className="text-green-400 text-center text-sm">Settings saved successfully.</p>
          )}
        </div>
      </div>
    </div>
  );
}
