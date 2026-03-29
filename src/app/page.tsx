'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Tabs from '@/components/Tabs';
import PipelineView from '@/components/PipelineView';
import HistoryView from '@/components/HistoryView';

interface PipelineState {
  id: string;
  title: string;
  status: string;
  results: Record<number, unknown>;
  currentAgent: number;
  currentStep: number;
  totalSteps: number;
  error?: string;
  startedAt?: string;
  completedAt?: string;
  finalScript?: string;
  input: { productBrief: string; targetLength: string; format?: string };
}

function getAISettings() {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem('ai-settings');
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
}

export default function Home() {
  const [tab, setTab] = useState('new');
  const [productBrief, setProductBrief] = useState('');
  const [targetLength, setTargetLength] = useState('60 seconds, approximately 150 words');
  const [format, setFormat] = useState('YouTube ad');
  const [pipelineId, setPipelineId] = useState<string | null>(null);
  const [pipelineState, setPipelineState] = useState<PipelineState | null>(null);
  const [starting, setStarting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasKey, setHasKey] = useState<boolean>(false);

  useEffect(() => {
    const s = getAISettings();
    setHasKey(!!s?.apiKey);
  }, []);

  // Re-check when tab changes (user might have just saved settings)
  useEffect(() => {
    if (tab === 'new') {
      const s = getAISettings();
      setHasKey(!!s?.apiKey);
    }
  }, [tab]);

  async function handleStart() {
    if (!productBrief.trim()) return;

    const aiSettings = getAISettings();
    if (!aiSettings?.apiKey) {
      setError('No AI API key configured. Go to Settings to set up your AI provider.');
      return;
    }

    setStarting(true);
    setError(null);

    try {
      // Create pipeline (with AI settings)
      const createRes = await fetch('/api/pipeline', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'create', productBrief, targetLength, format, aiSettings }),
      });
      const createData = await createRes.json();

      if (createData.error) {
        setError(createData.error);
        setStarting(false);
        return;
      }

      const newId = createData.pipelineId;
      setPipelineId(newId);

      // Run pipeline (with AI settings)
      const runRes = await fetch('/api/pipeline', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'run', pipelineId: newId, aiSettings }),
      });
      const runData = await runRes.json();

      if (runData.error) {
        setError(runData.error);
        setStarting(false);
        return;
      }

      // Fetch the running state
      const statusRes = await fetch('/api/pipeline', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'status', pipelineId: newId }),
      });
      const statusData = await statusRes.json();
      setPipelineState(statusData.state);
      setTab('pipeline');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Network error');
    } finally {
      setStarting(false);
    }
  }

  async function handleLoadPipeline(id: string) {
    try {
      const res = await fetch('/api/pipeline', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'status', pipelineId: id }),
      });
      const data = await res.json();
      if (data.state) {
        setPipelineId(id);
        setPipelineState(data.state);
        setTab('pipeline');
      } else {
        setError('Pipeline not found or server restarted. History is cleared on redeploy.');
      }
    } catch {
      setError('Failed to load pipeline');
    }
  }

  function handleReset() {
    setPipelineId(null);
    setPipelineState(null);
    setProductBrief('');
    setError(null);
    setTab('new');
  }

  const aiSettings = getAISettings();
  const providerName = aiSettings?.provider === 'groq' ? 'Groq' :
    aiSettings?.provider === 'grok' ? 'Grok' :
    aiSettings?.provider === 'openai' ? 'OpenAI' :
    aiSettings?.provider === 'anthropic' ? 'Anthropic' :
    aiSettings?.provider === 'custom' ? 'Custom' : '';

  const tabs = [
    { id: 'new', label: 'New Pipeline' },
    ...(pipelineState ? [{ id: 'pipeline', label: 'Current Run' }] : []),
    { id: 'history', label: 'History' },
  ];

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      {/* Top Bar */}
      <header className="border-b border-gray-800 bg-gray-950/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-5xl mx-auto px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center text-sm font-bold">
              20
            </div>
            <div>
              <h1 className="text-base font-semibold text-white leading-tight">Script Pipeline</h1>
              <p className="text-xs text-gray-500">20-Agent AI Writing System</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {hasKey ? (
              <span className="text-xs text-green-400 bg-green-500/10 px-2 py-1 rounded">
                {providerName} ({aiSettings?.model?.split('/').pop() || aiSettings?.model})
              </span>
            ) : (
              <span className="text-xs text-red-400 bg-red-500/10 px-2 py-1 rounded">No API key</span>
            )}
            <Link
              href="/settings"
              className="px-3 py-1.5 bg-gray-800 hover:bg-gray-700 rounded-lg text-xs text-gray-300 transition border border-gray-700"
            >
              Settings
            </Link>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-6 py-6">
        {/* Error Banner */}
        {error && (
          <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3 mb-6 flex items-center justify-between">
            <p className="text-red-400 text-sm">{error}</p>
            <button onClick={() => setError(null)} className="text-red-400 hover:text-red-300 text-sm ml-4 shrink-0">Dismiss</button>
          </div>
        )}

        <Tabs tabs={tabs} active={tab} onChange={setTab} />

        {/* New Pipeline Tab */}
        {tab === 'new' && (
          <div className="max-w-3xl">
            {!hasKey && (
              <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-4 mb-6">
                <p className="text-yellow-400 text-sm font-medium">Configure your AI provider first</p>
                <p className="text-yellow-400/70 text-xs mt-1">
                  Go to <Link href="/settings" className="underline">Settings</Link> to set up Groq, Grok, OpenAI, Claude, or a custom AI provider.
                </p>
              </div>
            )}

            <div className="space-y-5">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Product Brief</label>
                <textarea
                  value={productBrief}
                  onChange={e => setProductBrief(e.target.value)}
                  placeholder={`Enter your product brief here. Include:\n\n- Brand name and what the product does\n- Key features and differentiators\n- Target audience (who they are, what frustrates them)\n- What makes this product different from competitors\n- Any existing brand voice or tone guidelines`}
                  className="w-full h-56 px-4 py-3 bg-gray-900 border border-gray-800 rounded-lg text-white placeholder-gray-600 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/50 resize-none text-sm leading-relaxed transition"
                />
                <div className="flex justify-between mt-1.5">
                  <p className="text-xs text-gray-600">The more detail you provide, the better your script will be</p>
                  <p className="text-xs text-gray-600">{productBrief.length > 0 ? `${productBrief.split(/\s+/).filter(Boolean).length} words` : ''}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-gray-400 mb-1.5">Script Length</label>
                  <select
                    value={targetLength}
                    onChange={e => setTargetLength(e.target.value)}
                    className="w-full px-3 py-2.5 bg-gray-900 border border-gray-800 rounded-lg text-white text-sm focus:outline-none focus:border-blue-500 transition"
                  >
                    <option value="15 seconds, approximately 40 words">15 sec (~40 words)</option>
                    <option value="30 seconds, approximately 75 words">30 sec (~75 words)</option>
                    <option value="60 seconds, approximately 150 words">60 sec (~150 words)</option>
                    <option value="90 seconds, approximately 225 words">90 sec (~225 words)</option>
                    <option value="2 minutes, approximately 300 words">2 min (~300 words)</option>
                    <option value="3 minutes, approximately 450 words">3 min (~450 words)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-400 mb-1.5">Content Format</label>
                  <select
                    value={format}
                    onChange={e => setFormat(e.target.value)}
                    className="w-full px-3 py-2.5 bg-gray-900 border border-gray-800 rounded-lg text-white text-sm focus:outline-none focus:border-blue-500 transition"
                  >
                    <option>YouTube ad</option>
                    <option>YouTube long-form</option>
                    <option>TikTok</option>
                    <option>Instagram Reel</option>
                    <option>Facebook ad</option>
                    <option>Product launch video</option>
                    <option>Explainer video</option>
                    <option>Testimonial-style</option>
                    <option>Sales page video</option>
                    <option>Webinar intro</option>
                  </select>
                </div>
              </div>

              {/* Pipeline Overview */}
              <div className="bg-gray-900 border border-gray-800 rounded-lg p-4">
                <p className="text-xs font-medium text-gray-400 mb-3">Pipeline runs 20 agents across 5 phases:</p>
                <div className="flex gap-2 text-xs">
                  {[
                    { n: '1', label: 'Research', sub: '4 agents' },
                    { n: '2', label: 'Strategy', sub: '3 agents' },
                    { n: '3', label: 'Writing', sub: '6 agents' },
                    { n: '4', label: 'QC', sub: '4 agents' },
                    { n: '5', label: 'Assembly', sub: '3 agents' },
                  ].map((p, i) => (
                    <div key={p.n} className="flex items-center gap-2">
                      <div className="text-center">
                        <div className="w-7 h-7 rounded bg-gray-800 mx-auto mb-1 flex items-center justify-center text-xs font-bold text-gray-400">{p.n}</div>
                        <p className="text-gray-300">{p.label}</p>
                        <p className="text-gray-600">{p.sub}</p>
                      </div>
                      {i < 4 && <span className="text-gray-700 mt-[-16px]">→</span>}
                    </div>
                  ))}
                </div>
              </div>

              <button
                onClick={handleStart}
                disabled={starting || !productBrief.trim() || !hasKey}
                className="w-full py-3.5 bg-blue-600 hover:bg-blue-500 disabled:bg-gray-800 disabled:text-gray-600 rounded-lg font-semibold transition text-sm"
              >
                {starting ? (
                  <span className="flex items-center justify-center gap-2">
                    <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg>
                    Initializing Pipeline...
                  </span>
                ) : (
                  'Launch 20-Agent Pipeline'
                )}
              </button>
            </div>
          </div>
        )}

        {/* Pipeline View Tab */}
        {tab === 'pipeline' && pipelineState && pipelineId && (
          <PipelineView
            pipelineId={pipelineId}
            initialState={pipelineState as Parameters<typeof PipelineView>[0]['initialState']}
            onReset={handleReset}
          />
        )}

        {/* History Tab */}
        {tab === 'history' && (
          <HistoryView onLoad={handleLoadPipeline} />
        )}
      </main>
    </div>
  );
}
