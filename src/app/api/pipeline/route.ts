import { NextRequest, NextResponse } from 'next/server';
import { AGENTS } from '@/lib/agents';
import { runAgent, createPipelineState, getExecutionPlan, extractFinalScript, PipelineState } from '@/lib/pipeline';
import { AISettings } from '@/lib/ai-provider';
import store from '@/lib/pipeline-store';

export const maxDuration = 300; // 5 min max for Vercel

function parseSettings(body: Record<string, unknown>): AISettings | null {
  const s = body.aiSettings as Record<string, unknown> | undefined;
  if (!s || !s.apiKey) return null;
  return {
    provider: (s.provider as AISettings['provider']) || 'groq',
    apiKey: s.apiKey as string,
    model: (s.model as string) || 'llama-3.3-70b-versatile',
    baseUrl: (s.baseUrl as string) || undefined,
    temperature: (s.temperature as number) ?? 0.7,
    maxTokens: (s.maxTokens as number) ?? 4096,
  };
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { action } = body;

  if (action === 'create') {
    const { productBrief, targetLength, format } = body;
    if (!productBrief?.trim()) {
      return NextResponse.json({ error: 'Product brief is required' }, { status: 400 });
    }

    const settings = parseSettings(body);
    if (!settings) {
      return NextResponse.json({ error: 'No AI settings provided. Go to Settings to configure your AI provider.' }, { status: 400 });
    }

    const state = createPipelineState({
      productBrief: productBrief.trim(),
      targetLength: targetLength || '60 seconds, approximately 150 words',
      format: format || 'YouTube ad',
    });

    store.set(state.id, state);
    store.addToHistory({
      id: state.id,
      title: state.title,
      status: 'idle',
      createdAt: new Date().toISOString(),
    });

    return NextResponse.json({ pipelineId: state.id, state });
  }

  if (action === 'run') {
    const { pipelineId } = body;
    const state = store.get(pipelineId);
    if (!state) {
      return NextResponse.json({ error: 'Pipeline not found' }, { status: 404 });
    }

    if (state.status === 'running') {
      return NextResponse.json({ error: 'Pipeline is already running' }, { status: 400 });
    }

    const settings = parseSettings(body);
    if (!settings) {
      return NextResponse.json({ error: 'No AI settings provided. Go to Settings to configure your AI provider.' }, { status: 400 });
    }

    // Mark as running BEFORE returning response
    state.status = 'running';
    state.startedAt = new Date().toISOString();
    state.currentStep = 1;
    store.updateHistory(pipelineId, { status: 'running' });

    // Run pipeline async (fire and forget)
    runPipelineAsync(state, settings).catch(err => {
      state.status = 'failed';
      state.error = err instanceof Error ? err.message : 'Unknown error';
      store.updateHistory(pipelineId, { status: 'failed' });
    });

    return NextResponse.json({ pipelineId, status: 'running' });
  }

  if (action === 'status') {
    const { pipelineId } = body;
    const state = store.get(pipelineId);
    if (!state) {
      return NextResponse.json({ error: 'Pipeline not found' }, { status: 404 });
    }
    return NextResponse.json({ state });
  }

  if (action === 'retry-agent') {
    const { pipelineId, agentId } = body;
    const state = store.get(pipelineId);
    if (!state) {
      return NextResponse.json({ error: 'Pipeline not found' }, { status: 404 });
    }

    const settings = parseSettings(body);
    if (!settings) {
      return NextResponse.json({ error: 'No AI settings provided.' }, { status: 400 });
    }

    const agent = AGENTS.find(a => a.id === agentId);
    if (!agent) {
      return NextResponse.json({ error: 'Agent not found' }, { status: 404 });
    }

    const result = state.results[agentId];
    result.status = 'running';
    result.startedAt = new Date().toISOString();
    result.error = undefined;
    result.retryCount += 1;

    try {
      const output = await runAgent(agent, state.input, state.results, settings);
      result.output = output;
      result.status = 'completed';
      result.completedAt = new Date().toISOString();
      result.duration = Date.now() - new Date(result.startedAt!).getTime();
      result.tokenEstimate = Math.round(output.length / 4);
      return NextResponse.json({ success: true, output });
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : 'Unknown error';
      result.status = 'failed';
      result.error = errorMsg;
      return NextResponse.json({ error: errorMsg }, { status: 500 });
    }
  }

  if (action === 'cancel') {
    const { pipelineId } = body;
    const state = store.get(pipelineId);
    if (!state) {
      return NextResponse.json({ error: 'Pipeline not found' }, { status: 404 });
    }
    state.status = 'cancelled';
    store.updateHistory(pipelineId, { status: 'cancelled' });
    return NextResponse.json({ success: true });
  }

  if (action === 'history') {
    return NextResponse.json({ history: store.getHistory() });
  }

  if (action === 'export') {
    const { pipelineId } = body;
    const state = store.get(pipelineId);
    if (!state) {
      return NextResponse.json({ error: 'Pipeline not found' }, { status: 404 });
    }

    const script = extractFinalScript(state);
    const doc = {
      title: state.title,
      createdAt: state.startedAt,
      completedAt: state.completedAt,
      input: state.input,
      finalScript: script,
      agentOutputs: Object.values(state.results)
        .filter(r => r.status === 'completed')
        .map(r => ({ agent: r.agentName, phase: r.phase, output: r.output })),
    };

    return NextResponse.json({ export: doc });
  }

  if (action === 'test') {
    const settings = parseSettings(body);
    if (!settings) {
      return NextResponse.json({ error: 'No AI settings provided.' }, { status: 400 });
    }

    // Quick test call
    try {
      const { callAI } = await import('@/lib/ai-provider');
      const result = await callAI(settings, 'You are a test assistant.', 'Reply with exactly: "Connection successful." Nothing else.');
      return NextResponse.json({ success: true, message: `AI responded: ${result.substring(0, 100)}` });
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : 'Unknown error';
      return NextResponse.json({ error: errorMsg }, { status: 500 });
    }
  }

  return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
}

async function runPipelineAsync(state: PipelineState, settings: AISettings) {
  const plan = getExecutionPlan();

  for (const step of plan) {
    if (state.status === 'cancelled') return;

    state.currentStep = step.step;

    const promises = step.agents.map(async (agentId) => {
      if (state.status === 'cancelled') return;

      const agent = AGENTS.find(a => a.id === agentId)!;
      const result = state.results[agentId];
      result.status = 'running';
      result.startedAt = new Date().toISOString();
      state.currentAgent = agentId;

      const startTime = Date.now();

      try {
        const output = await runAgent(agent, state.input, state.results, settings);
        result.output = output;
        result.status = 'completed';
        result.completedAt = new Date().toISOString();
        result.duration = Date.now() - startTime;
        result.tokenEstimate = Math.round(output.length / 4);
      } catch (err: unknown) {
        const errorMsg = err instanceof Error ? err.message : 'Unknown error';
        result.status = 'failed';
        result.error = errorMsg;
        result.duration = Date.now() - startTime;

        // Auto-retry once
        if (result.retryCount < 1) {
          result.retryCount += 1;
          result.status = 'running';
          result.error = undefined;
          try {
            const output = await runAgent(agent, state.input, state.results, settings);
            result.output = output;
            result.status = 'completed';
            result.completedAt = new Date().toISOString();
            result.duration = Date.now() - startTime;
            result.tokenEstimate = Math.round(output.length / 4);
          } catch (retryErr: unknown) {
            const retryMsg = retryErr instanceof Error ? retryErr.message : 'Unknown error';
            result.status = 'failed';
            result.error = `Failed after retry: ${retryMsg}`;
          }
        }
      }
    });

    await Promise.all(promises);

    const failedAgents = step.agents.filter(id => state.results[id].status === 'failed');
    if (failedAgents.length > 0) {
      state.status = 'failed';
      state.error = `Step ${step.step} failed: ${failedAgents.map(id => state.results[id].agentName).join(', ')}`;
      store.updateHistory(state.id, { status: 'failed' });
      return;
    }
  }

  state.status = 'completed';
  state.completedAt = new Date().toISOString();
  state.finalScript = extractFinalScript(state);
  store.updateHistory(state.id, { status: 'completed', completedAt: state.completedAt });
}

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const pipelineId = url.searchParams.get('id');

  if (pipelineId) {
    const state = store.get(pipelineId);
    if (!state) {
      return NextResponse.json({ error: 'Pipeline not found' }, { status: 404 });
    }
    return NextResponse.json({ state });
  }

  return NextResponse.json({ pipelines: store.listAll() });
}
