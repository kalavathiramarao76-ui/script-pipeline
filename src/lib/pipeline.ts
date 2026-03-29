// Pipeline orchestrator - runs all 20 agents in sequence with quality gates

import { AGENTS, AgentDef } from './agents';
import { AISettings, callAI } from './ai-provider';

export interface PipelineInput {
  productBrief: string;
  targetLength: string; // e.g., "60 seconds, approximately 150 words"
  brandExamples?: string;
  format?: string;
}

export interface AgentResult {
  agentId: number;
  agentName: string;
  phase: string;
  output: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  error?: string;
  startedAt?: string;
  completedAt?: string;
}

export interface PipelineState {
  id: string;
  input: PipelineInput;
  results: Record<number, AgentResult>;
  currentAgent: number;
  status: 'idle' | 'running' | 'completed' | 'failed';
  error?: string;
  startedAt?: string;
  completedAt?: string;
}

function resolvePrompt(agent: AgentDef, context: Record<string, string>): string {
  let prompt = agent.prompt;
  for (const [key, value] of Object.entries(context)) {
    prompt = prompt.replace(new RegExp(`{{${key}}}`, 'g'), value || '[Not available]');
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

  // Map agent outputs
  for (const dep of agent.inputs) {
    if (dep === 'productBrief' || dep === 'targetLength') continue;

    if (dep === 'assembledScript') {
      // For QC agents, assemble the script from hook + body + CTA
      const hook = results[9]?.output || '';
      const body = results[11]?.output || '';
      const cta = results[13]?.output || '';
      ctx.assembledScript = `${hook}\n\n---\n\n${body}\n\n---\n\n${cta}`;
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

  const systemPrompt = `You are ${agent.role}. You are Agent ${agent.id} of 20 in a professional script writing pipeline. Phase: ${agent.phase}. Your output will be used by subsequent agents, so be thorough, structured, and specific.`;

  return callAI(aiSettings, systemPrompt, resolvedPrompt);
}

// Get the execution order - some agents can run in parallel
export function getExecutionPlan(): { step: number; agents: number[] }[] {
  return [
    { step: 1, agents: [1, 2, 3] },        // Research (parallel)
    { step: 2, agents: [4] },               // Research Synthesis
    { step: 3, agents: [5, 7] },            // Audience Profile + Brand Voice (parallel)
    { step: 4, agents: [6] },               // Angle Selection (needs agent 5)
    { step: 5, agents: [8] },               // Hook Writer
    { step: 6, agents: [9] },               // Hook Manager
    { step: 7, agents: [10] },              // Body Writer
    { step: 8, agents: [11] },              // Body Manager
    { step: 9, agents: [12] },              // CTA Writer
    { step: 10, agents: [13] },             // CTA Manager
    { step: 11, agents: [14, 15, 16] },     // QC checks (parallel)
    { step: 12, agents: [17] },             // Budget Enforcer
    { step: 13, agents: [18] },             // Script Assembler
    { step: 14, agents: [19] },             // Transition Polisher
    { step: 15, agents: [20] },             // Final Review
  ];
}

export function createPipelineState(input: PipelineInput): PipelineState {
  const results: Record<number, AgentResult> = {};
  for (const agent of AGENTS) {
    results[agent.id] = {
      agentId: agent.id,
      agentName: agent.name,
      phase: agent.phase,
      output: '',
      status: 'pending',
    };
  }

  return {
    id: crypto.randomUUID(),
    input,
    results,
    currentAgent: 0,
    status: 'idle',
    startedAt: undefined,
    completedAt: undefined,
  };
}
