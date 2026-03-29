'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import AgentCard from '@/components/AgentCard';

interface AgentResult {
  agentId: number;
  agentName: string;
  phase: string;
  output: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  error?: string;
}

interface PipelineState {
  id: string;
  status: 'idle' | 'running' | 'completed' | 'failed';
  results: Record<number, AgentResult>;
  currentAgent: number;
  error?: string;
}

const PHASES = [
  { num: 1, name: 'Research', agents: [1, 2, 3, 4] },
  { num: 2, name: 'Strategy', agents: [5, 6, 7] },
  { num: 3, name: 'Writing', agents: [8, 9, 10, 11, 12, 13] },
  { num: 4, name: 'Quality Control', agents: [14, 15, 16, 17] },
  { num: 5, name: 'Assembly', agents: [18, 19, 20] },
];

export default function Home() {
  const [productBrief, setProductBrief] = useState('');
  const [targetLength, setTargetLength] = useState('60 seconds, approximately 150 words');
  const [format, setFormat] = useState('YouTube ad');
  const [pipelineId, setPipelineId] = useState<string | null>(null);
  const [state, setState] = useState<PipelineState | null>(null);
  const [starting, setStarting] = useState(false);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const [finalScript, setFinalScript] = useState<string | null>(null);

  useEffect(() => {
    if (pipelineId && state?.status === 'running') {
      pollRef.current = setInterval(async () => {
        const res = await fetch('/api/pipeline', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'status', pipelineId }),
        });
        const data = await res.json();
        if (data.state) {
          setState(data.state);
          if (data.state.status !== 'running') {
            if (pollRef.current) clearInterval(pollRef.current);
            if (data.state.status === 'completed' && data.state.results[20]?.output) {
              setFinalScript(data.state.results[20].output);
            }
          }
        }
      }, 2000);
      return () => {
        if (pollRef.current) clearInterval(pollRef.current);
      };
    }
  }, [pipelineId, state?.status]);

  async function handleStart() {
    if (!productBrief.trim()) return;
    setStarting(true);
    setFinalScript(null);

    const createRes = await fetch('/api/pipeline', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'create', productBrief, targetLength, format }),
    });
    const createData = await createRes.json();

    if (createData.error) {
      alert(createData.error);
      setStarting(false);
      return;
    }

    setPipelineId(createData.pipelineId);
    setState(createData.state);

    const runRes = await fetch('/api/pipeline', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'run', pipelineId: createData.pipelineId }),
    });
    const runData = await runRes.json();

    if (runData.error) {
      alert(runData.error);
      setStarting(false);
      return;
    }

    setStarting(false);
  }

  const completedCount = state
    ? Object.values(state.results).filter(r => r.status === 'completed').length
    : 0;
  const runningCount = state
    ? Object.values(state.results).filter(r => r.status === 'running').length
    : 0;

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      <div className="max-w-5xl mx-auto p-6">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold">20-Agent Script Pipeline</h1>
            <p className="text-gray-400 mt-1">AI-powered script writing system with quality gates</p>
          </div>
          <Link
            href="/settings"
            className="px-4 py-2 bg-gray-800 hover:bg-gray-700 rounded-lg text-sm transition border border-gray-700"
          >
            AI Settings
          </Link>
        </div>

        {!state && (
          <div className="bg-gray-900 rounded-xl p-6 border border-gray-800 mb-8">
            <h2 className="text-lg font-semibold mb-4">Product Brief</h2>
            <textarea
              value={productBrief}
              onChange={e => setProductBrief(e.target.value)}
              placeholder={`Describe your product:\n- Brand name and what it does\n- Key features and differentiators\n- Target audience\n- What problem it solves\n- What makes it different from competitors`}
              className="w-full h-48 px-4 py-3 bg-gray-950 border border-gray-700 rounded-lg text-white placeholder-gray-600 focus:outline-none focus:border-blue-500 resize-none"
            />

            <div className="grid grid-cols-2 gap-4 mt-4">
              <div>
                <label className="block text-sm text-gray-400 mb-1">Target Length</label>
                <select
                  value={targetLength}
                  onChange={e => setTargetLength(e.target.value)}
                  className="w-full px-3 py-2 bg-gray-950 border border-gray-700 rounded-lg text-white text-sm"
                >
                  <option value="30 seconds, approximately 75 words">30 seconds (~75 words)</option>
                  <option value="60 seconds, approximately 150 words">60 seconds (~150 words)</option>
                  <option value="90 seconds, approximately 225 words">90 seconds (~225 words)</option>
                  <option value="2 minutes, approximately 300 words">2 minutes (~300 words)</option>
                </select>
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-1">Format</label>
                <select
                  value={format}
                  onChange={e => setFormat(e.target.value)}
                  className="w-full px-3 py-2 bg-gray-950 border border-gray-700 rounded-lg text-white text-sm"
                >
                  <option>YouTube ad</option>
                  <option>TikTok</option>
                  <option>Instagram Reel</option>
                  <option>Product launch video</option>
                  <option>Explainer video</option>
                  <option>Testimonial-style</option>
                </select>
              </div>
            </div>

            <button
              onClick={handleStart}
              disabled={starting || !productBrief.trim()}
              className="w-full mt-6 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-700 disabled:text-gray-500 rounded-lg font-semibold text-lg transition"
            >
              {starting ? 'Initializing Pipeline...' : 'Run 20-Agent Pipeline'}
            </button>
          </div>
        )}

        {state && (
          <>
            <div className="bg-gray-900 rounded-xl p-4 border border-gray-800 mb-6">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-gray-400">
                  Pipeline:{' '}
                  <span className={
                    state.status === 'running' ? 'text-yellow-400' :
                    state.status === 'completed' ? 'text-green-400' :
                    state.status === 'failed' ? 'text-red-400' : 'text-gray-400'
                  }>{state.status}</span>
                </span>
                <span className="text-sm text-gray-400">
                  {completedCount}/20 agents {runningCount > 0 && `(${runningCount} running)`}
                </span>
              </div>
              <div className="w-full bg-gray-700 rounded-full h-2">
                <div
                  className={`h-2 rounded-full transition-all duration-500 ${
                    state.status === 'failed' ? 'bg-red-500' : 'bg-blue-500'
                  }`}
                  style={{ width: `${(completedCount / 20) * 100}%` }}
                />
              </div>

              {state.status !== 'running' && (
                <button
                  onClick={() => { setState(null); setPipelineId(null); setFinalScript(null); }}
                  className="mt-3 text-sm text-blue-400 hover:text-blue-300"
                >
                  Start New Pipeline
                </button>
              )}
            </div>

            {finalScript && (
              <div className="bg-gray-900 rounded-xl p-6 border border-green-700 mb-6">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-lg font-bold text-green-400">Final Script</h2>
                  <button
                    onClick={() => navigator.clipboard.writeText(finalScript)}
                    className="px-3 py-1 bg-gray-800 hover:bg-gray-700 rounded text-sm transition"
                  >
                    Copy
                  </button>
                </div>
                <pre className="text-sm text-gray-200 whitespace-pre-wrap leading-relaxed">
                  {finalScript}
                </pre>
              </div>
            )}

            {PHASES.map(phase => (
              <div key={phase.num} className="mb-6">
                <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-3">
                  Phase {phase.num}: {phase.name}
                </h2>
                <div className="grid gap-2">
                  {phase.agents.map(agentId => {
                    const result = state.results[agentId];
                    return result ? (
                      <AgentCard
                        key={agentId}
                        agentId={agentId}
                        name={result.agentName}
                        phase={result.phase}
                        status={result.status}
                        output={result.output}
                        error={result.error}
                      />
                    ) : null;
                  })}
                </div>
              </div>
            ))}
          </>
        )}
      </div>
    </div>
  );
}
