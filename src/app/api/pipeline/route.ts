import { NextRequest, NextResponse } from 'next/server';
import { AGENTS } from '@/lib/agents';
import { loadSettings } from '@/lib/settings-store';
import { runAgent, createPipelineState, getExecutionPlan, PipelineState } from '@/lib/pipeline';

// In-memory pipeline store (use a DB in production)
const pipelines = new Map<string, PipelineState>();

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { action } = body;

  if (action === 'create') {
    const { productBrief, targetLength, format } = body;
    if (!productBrief) {
      return NextResponse.json({ error: 'Product brief is required' }, { status: 400 });
    }
    const state = createPipelineState({
      productBrief,
      targetLength: targetLength || '60 seconds, approximately 150 words',
      format: format || 'YouTube ad',
    });
    pipelines.set(state.id, state);
    return NextResponse.json({ pipelineId: state.id, state });
  }

  if (action === 'run') {
    const { pipelineId } = body;
    const state = pipelines.get(pipelineId);
    if (!state) {
      return NextResponse.json({ error: 'Pipeline not found' }, { status: 404 });
    }

    const settings = await loadSettings();
    if (!settings.apiKey) {
      return NextResponse.json({ error: 'No AI API key configured. Please go to Settings first.' }, { status: 400 });
    }

    // Run pipeline in background - return immediately
    state.status = 'running';
    state.startedAt = new Date().toISOString();

    runPipelineAsync(state, settings);

    return NextResponse.json({ pipelineId, status: 'running' });
  }

  if (action === 'status') {
    const { pipelineId } = body;
    const state = pipelines.get(pipelineId);
    if (!state) {
      return NextResponse.json({ error: 'Pipeline not found' }, { status: 404 });
    }
    return NextResponse.json({ state });
  }

  if (action === 'run-single') {
    const { pipelineId, agentId } = body;
    const state = pipelines.get(pipelineId);
    if (!state) {
      return NextResponse.json({ error: 'Pipeline not found' }, { status: 404 });
    }

    const settings = await loadSettings();
    const agent = AGENTS.find(a => a.id === agentId);
    if (!agent) {
      return NextResponse.json({ error: 'Agent not found' }, { status: 404 });
    }

    state.results[agentId].status = 'running';
    state.results[agentId].startedAt = new Date().toISOString();

    try {
      const output = await runAgent(agent, state.input, state.results, settings);
      state.results[agentId].output = output;
      state.results[agentId].status = 'completed';
      state.results[agentId].completedAt = new Date().toISOString();
      return NextResponse.json({ success: true, output });
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : 'Unknown error';
      state.results[agentId].status = 'failed';
      state.results[agentId].error = errorMsg;
      return NextResponse.json({ error: errorMsg }, { status: 500 });
    }
  }

  return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
}

async function runPipelineAsync(state: PipelineState, settings: ReturnType<typeof loadSettings> extends Promise<infer T> ? T : never) {
  const plan = getExecutionPlan();

  for (const step of plan) {
    // Run agents in this step in parallel
    const promises = step.agents.map(async (agentId) => {
      const agent = AGENTS.find(a => a.id === agentId)!;
      state.results[agentId].status = 'running';
      state.results[agentId].startedAt = new Date().toISOString();
      state.currentAgent = agentId;

      try {
        const output = await runAgent(agent, state.input, state.results, settings);
        state.results[agentId].output = output;
        state.results[agentId].status = 'completed';
        state.results[agentId].completedAt = new Date().toISOString();
      } catch (err: unknown) {
        const errorMsg = err instanceof Error ? err.message : 'Unknown error';
        state.results[agentId].status = 'failed';
        state.results[agentId].error = errorMsg;
      }
    });

    await Promise.all(promises);

    // Check if any agent in this step failed
    const anyFailed = step.agents.some(id => state.results[id].status === 'failed');
    if (anyFailed) {
      state.status = 'failed';
      state.error = `Step ${step.step} failed. Check individual agent results.`;
      return;
    }
  }

  state.status = 'completed';
  state.completedAt = new Date().toISOString();
}

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const pipelineId = url.searchParams.get('id');

  if (pipelineId) {
    const state = pipelines.get(pipelineId);
    if (!state) {
      return NextResponse.json({ error: 'Pipeline not found' }, { status: 404 });
    }
    return NextResponse.json({ state });
  }

  // List all pipelines
  const list = Array.from(pipelines.values()).map(p => ({
    id: p.id,
    status: p.status,
    startedAt: p.startedAt,
    currentAgent: p.currentAgent,
  }));
  return NextResponse.json({ pipelines: list });
}
