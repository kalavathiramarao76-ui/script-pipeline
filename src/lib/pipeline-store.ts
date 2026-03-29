// In-memory pipeline store with persistence support
// Production would use Redis/Postgres, this uses a singleton Map

import { PipelineState } from './pipeline';

class PipelineStore {
  private pipelines = new Map<string, PipelineState>();
  private history: { id: string; title: string; status: string; createdAt: string; completedAt?: string }[] = [];

  set(id: string, state: PipelineState) {
    this.pipelines.set(id, state);
  }

  get(id: string): PipelineState | undefined {
    return this.pipelines.get(id);
  }

  addToHistory(entry: { id: string; title: string; status: string; createdAt: string; completedAt?: string }) {
    const existing = this.history.findIndex(h => h.id === entry.id);
    if (existing >= 0) {
      this.history[existing] = entry;
    } else {
      this.history.unshift(entry);
    }
    // Keep last 50
    if (this.history.length > 50) this.history = this.history.slice(0, 50);
  }

  updateHistory(id: string, updates: Partial<{ status: string; completedAt: string }>) {
    const entry = this.history.find(h => h.id === id);
    if (entry) Object.assign(entry, updates);
  }

  getHistory() {
    return this.history;
  }

  listAll() {
    return Array.from(this.pipelines.entries()).map(([id, p]) => ({
      id,
      status: p.status,
      startedAt: p.startedAt,
      currentAgent: p.currentAgent,
    }));
  }
}

// Singleton
const store = new PipelineStore();
export default store;
