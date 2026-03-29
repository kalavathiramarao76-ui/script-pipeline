// Pipeline orchestrator - runs all 20 agents in sequence with quality gates

import { AGENTS, AgentDef } from './agents';
import { AISettings, callAI } from './ai-provider';

export interface PipelineInput {
  productBrief: string;
  targetLength: string;
  brandExamples?: string;
  format?: string;
}

export interface AgentResult {
  agentId: number;
  agentName: string;
  phase: string;
  phaseNumber: number;
  output: string;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'skipped';
  error?: string;
  startedAt?: string;
  completedAt?: string;
  duration?: number; // ms
  tokenEstimate?: number;
  retryCount: number;
}

export interface PipelineState {
  id: string;
  title: string;
  input: PipelineInput;
  results: Record<number, AgentResult>;
  currentAgent: number;
  currentStep: number;
  totalSteps: number;
  status: 'idle' | 'running' | 'completed' | 'failed' | 'cancelled';
  error?: string;
  startedAt?: string;
  completedAt?: string;
  finalScript?: string;
}

function resolvePrompt(agent: AgentDef, context: Record<string, string>): string {
  let prompt = agent.prompt;
  for (const [key, value] of Object.entries(context)) {
    prompt = prompt.replace(new RegExp(`\\{\\{${key}\\}\\}`, 'g'), value || '[Not available]');
  }
  return prompt;
}

function buildContext(
  agent: AgentDef,
  input: PipelineInput,
  results: Record<number, AgentResult>,
): Record<string, string> {
  const ctx: Record<string, string> = {
    productBrief: input.productBrief,
    targetLength: input.targetLength,
  };

  for (const dep of agent.inputs) {
    if (dep === 'productBrief' || dep === 'targetLength') continue;

    if (dep === 'assembledScript') {
      const hook = results[9]?.output || '';
      const body = results[11]?.output || '';
      const cta = results[13]?.output || '';
      ctx.assembledScript = `HOOK:\n${hook}\n\nBODY:\n${body}\n\nCTA:\n${cta}`;
      continue;
    }

    const match = dep.match(/^agent(\d+)$/);
    if (match) {
      const agentId = parseInt(match[1]);
      ctx[dep] = results[agentId]?.output || '[Not yet available]';
    }
  }

  return ctx;
}

export async function runAgent(
  agent: AgentDef,
  input: PipelineInput,
  results: Record<number, AgentResult>,
  aiSettings: AISettings,
): Promise<string> {
  const context = buildContext(agent, input, results);
  const resolvedPrompt = resolvePrompt(agent, context);

  const systemPrompt = `You are ${agent.role}. You are Agent ${agent.id} of 20 in a professional script writing pipeline. Phase: ${agent.phase} (Phase ${agent.phaseNumber} of 5). Your output will be used by subsequent agents, so be thorough, structured, and specific. Do not include meta-commentary about the pipeline itself — just do your job excellently.`;

  return callAI(aiSettings, systemPrompt, resolvedPrompt);
}

export function getExecutionPlan(): { step: number; agents: number[]; description: string }[] {
  return [
    { step: 1, agents: [1, 2, 3], description: 'Platform Research (YouTube, Reddit, X)' },
    { step: 2, agents: [4], description: 'Research Synthesis' },
    { step: 3, agents: [5, 7], description: 'Audience Profile + Brand Voice' },
    { step: 4, agents: [6], description: 'Angle Selection' },
    { step: 5, agents: [8], description: 'Hook Writing' },
    { step: 6, agents: [9], description: 'Hook Quality Gate' },
    { step: 7, agents: [10], description: 'Body Writing' },
    { step: 8, agents: [11], description: 'Body Quality Gate' },
    { step: 9, agents: [12], description: 'CTA Writing' },
    { step: 10, agents: [13], description: 'CTA Quality Gate' },
    { step: 11, agents: [14, 15, 16], description: 'Quality Control Checks' },
    { step: 12, agents: [17], description: 'Budget Enforcement' },
    { step: 13, agents: [18], description: 'Script Assembly' },
    { step: 14, agents: [19], description: 'Transition Polish' },
    { step: 15, agents: [20], description: 'Final Review' },
  ];
}

export function createPipelineState(input: PipelineInput): PipelineState {
  const results: Record<number, AgentResult> = {};
  for (const agent of AGENTS) {
    results[agent.id] = {
      agentId: agent.id,
      agentName: agent.name,
      phase: agent.phase,
      phaseNumber: agent.phaseNumber,
      output: '',
      status: 'pending',
      retryCount: 0,
    };
  }

  // Generate a short title from the product brief
  const title = input.productBrief.substring(0, 60).replace(/\n/g, ' ').trim() + (input.productBrief.length > 60 ? '...' : '');

  return {
    id: crypto.randomUUID(),
    title,
    input,
    results,
    currentAgent: 0,
    currentStep: 0,
    totalSteps: 15,
    status: 'idle',
  };
}

export function extractFinalScript(state: PipelineState): string | undefined {
  // Try agent 20 first, then fall back through the chain
  if (state.results[20]?.output) return state.results[20].output;
  if (state.results[19]?.output) return state.results[19].output;
  if (state.results[18]?.output) return state.results[18].output;
  return undefined;
}
