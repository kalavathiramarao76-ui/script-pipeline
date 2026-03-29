'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

const PROVIDERS = [
  { id: 'grok', name: 'Grok (xAI)', desc: 'Fast, great for creative writing', models: ['grok-3', 'grok-3-mini', 'grok-2'], baseUrl: 'https://api.x.ai/v1' },
  { id: 'openai', name: 'OpenAI', desc: 'GPT-4o and latest models', models: ['gpt-4o', 'gpt-4o-mini', 'gpt-4-turbo', 'o1', 'o3-mini'], baseUrl: 'https://api.openai.com/v1' },
  { id: 'anthropic', name: 'Anthropic', desc: 'Claude models, excellent reasoning', models: ['claude-sonnet-4-20250514', 'claude-opus-4-20250514', 'claude-haiku-4-5-20251001'], baseUrl: 'https://api.anthropic.com/v1' },
  { id: 'custom', name: 'Custom', desc: 'Any OpenAI-compatible API', models: [], baseUrl: '' },
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
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ ok: boolean; msg: string } | null>(null);

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
      else setModel('');
    }
    setTestResult(null);
  }

  async function handleSave() {
    setSaving(true);
    setTestResult(null);
    await fetch('/api/settings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ provider, apiKey, model, baseUrl, temperature, maxTokens }),
    });
    setSaving(false);
    setSaved(true);
    setHasKey(!!apiKey && !apiKey.startsWith('••••'));
    setTimeout(() => setSaved(false), 3000);
  }

  async function handleTest() {
    setTesting(true);
    setTestResult(null);
    // Save first, then test
    await fetch('/api/settings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ provider, apiKey, model, baseUrl, temperature, maxTokens }),
    });

    try {
      const res = await fetch('/api/pipeline', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'create',
          productBrief: 'Test connection - this is a test product brief to verify the AI provider is working.',
          targetLength: '30 seconds',
        }),
      });
      const data = await res.json();
      if (data.error) {
        setTestResult({ ok: false, msg: data.error });
      } else {
        setTestResult({ ok: true, msg: `Connected successfully. Pipeline created (${data.pipelineId.slice(0, 8)}...)` });
      }
    } catch (err) {
      setTestResult({ ok: false, msg: err instanceof Error ? err.message : 'Connection failed' });
    }
    setTesting(false);
  }

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      <header className="border-b border-gray-800 bg-gray-950/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-2xl mx-auto px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/" className="text-gray-400 hover:text-white transition">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </Link>
            <h1 className="text-base font-semibold">AI Provider Settings</h1>
          </div>
          {hasKey && <span className="text-xs text-green-400 bg-green-500/10 px-2 py-1 rounded">Connected</span>}
        </div>
      </header>

      <div className="max-w-2xl mx-auto px-6 py-8">
        <div className="space-y-6">
          {/* Provider Selection */}
          <div>
            <label className="block text-xs font-medium text-gray-400 mb-2 uppercase tracking-wider">Provider</label>
            <div className="grid grid-cols-2 gap-2">
              {PROVIDERS.map(p => (
                <button
                  key={p.id}
                  onClick={() => handleProviderChange(p.id)}
                  className={`p-3 rounded-lg border text-left transition ${
                    provider === p.id
                      ? 'border-blue-500/50 bg-blue-500/10'
                      : 'border-gray-800 bg-gray-900 hover:border-gray-700'
                  }`}
                >
                  <div className={`font-medium text-sm ${provider === p.id ? 'text-blue-300' : 'text-gray-300'}`}>{p.name}</div>
                  <div className="text-xs text-gray-500 mt-0.5">{p.desc}</div>
                </button>
              ))}
            </div>
          </div>

          {/* API Key */}
          <div>
            <label className="block text-xs font-medium text-gray-400 mb-1.5 uppercase tracking-wider">API Key</label>
            <input
              type="password"
              value={apiKey}
              onChange={e => setApiKey(e.target.value)}
              placeholder={`Enter your ${selectedProvider?.name || 'AI'} API key...`}
              className="w-full px-4 py-2.5 bg-gray-900 border border-gray-800 rounded-lg text-white placeholder-gray-600 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/50 text-sm transition"
            />
            <p className="text-xs text-gray-600 mt-1.5">
              {provider === 'grok' && 'Get your key at console.x.ai'}
              {provider === 'openai' && 'Get your key at platform.openai.com/api-keys'}
              {provider === 'anthropic' && 'Get your key at console.anthropic.com'}
              {provider === 'custom' && 'Enter the API key for your custom provider'}
            </p>
          </div>

          {/* Model */}
          <div>
            <label className="block text-xs font-medium text-gray-400 mb-1.5 uppercase tracking-wider">Model</label>
            {selectedProvider && selectedProvider.models.length > 0 ? (
              <select
                value={model}
                onChange={e => setModel(e.target.value)}
                className="w-full px-4 py-2.5 bg-gray-900 border border-gray-800 rounded-lg text-white focus:outline-none focus:border-blue-500 text-sm transition"
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
                placeholder="Model name (e.g., llama-3.1-70b-instruct)"
                className="w-full px-4 py-2.5 bg-gray-900 border border-gray-800 rounded-lg text-white placeholder-gray-600 focus:outline-none focus:border-blue-500 text-sm transition"
              />
            )}
          </div>

          {/* Base URL (always shown for custom, hidden for others) */}
          {provider === 'custom' && (
            <div>
              <label className="block text-xs font-medium text-gray-400 mb-1.5 uppercase tracking-wider">API Base URL</label>
              <input
                type="text"
                value={baseUrl}
                onChange={e => setBaseUrl(e.target.value)}
                placeholder="https://your-api.com/v1"
                className="w-full px-4 py-2.5 bg-gray-900 border border-gray-800 rounded-lg text-white placeholder-gray-600 focus:outline-none focus:border-blue-500 text-sm transition"
              />
              <p className="text-xs text-gray-600 mt-1.5">Must be OpenAI-compatible (supports /chat/completions endpoint)</p>
            </div>
          )}

          {/* Advanced Settings */}
          <details className="group">
            <summary className="text-xs font-medium text-gray-400 uppercase tracking-wider cursor-pointer hover:text-gray-300 transition">
              Advanced Settings
            </summary>
            <div className="mt-4 space-y-4">
              <div>
                <label className="block text-xs text-gray-400 mb-1.5">
                  Temperature: <span className="text-white">{temperature}</span>
                </label>
                <input
                  type="range" min="0" max="1" step="0.1"
                  value={temperature}
                  onChange={e => setTemperature(parseFloat(e.target.value))}
                  className="w-full accent-blue-500"
                />
                <div className="flex justify-between text-xs text-gray-600 mt-1">
                  <span>Precise (0)</span>
                  <span>Balanced (0.5)</span>
                  <span>Creative (1)</span>
                </div>
              </div>
              <div>
                <label className="block text-xs text-gray-400 mb-1.5">Max Tokens per Agent</label>
                <select
                  value={maxTokens}
                  onChange={e => setMaxTokens(parseInt(e.target.value))}
                  className="w-full px-4 py-2.5 bg-gray-900 border border-gray-800 rounded-lg text-white text-sm"
                >
                  <option value={2048}>2,048 (faster, shorter outputs)</option>
                  <option value={4096}>4,096 (recommended)</option>
                  <option value={8192}>8,192 (detailed outputs)</option>
                  <option value={16384}>16,384 (maximum detail)</option>
                </select>
              </div>
            </div>
          </details>

          {/* Test Result */}
          {testResult && (
            <div className={`p-3 rounded-lg border text-sm ${
              testResult.ok
                ? 'bg-green-500/10 border-green-500/30 text-green-400'
                : 'bg-red-500/10 border-red-500/30 text-red-400'
            }`}>
              {testResult.msg}
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex gap-3">
            <button
              onClick={handleSave}
              disabled={saving}
              className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-500 disabled:bg-blue-800 rounded-lg font-medium text-sm transition"
            >
              {saving ? 'Saving...' : saved ? 'Saved!' : 'Save Settings'}
            </button>
            <button
              onClick={handleTest}
              disabled={testing || !apiKey.trim()}
              className="px-6 py-2.5 bg-gray-800 hover:bg-gray-700 disabled:bg-gray-900 disabled:text-gray-600 rounded-lg font-medium text-sm transition border border-gray-700"
            >
              {testing ? 'Testing...' : 'Test Connection'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
