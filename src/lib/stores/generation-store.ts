import { create } from "zustand";
import type { Generation } from "@/types/database";

interface GenerationState {
  activeGenerations: Map<string, Generation>;
  addGeneration: (gen: Generation) => void;
  updateGeneration: (id: string, updates: Partial<Generation>) => void;
  removeGeneration: (id: string) => void;
  getProcessing: () => Generation[];
}

export const useGenerationStore = create<GenerationState>((set, get) => ({
  activeGenerations: new Map(),

  addGeneration: (gen) =>
    set((state) => {
      const map = new Map(state.activeGenerations);
      map.set(gen.id, gen);
      return { activeGenerations: map };
    }),

  updateGeneration: (id, updates) =>
    set((state) => {
      const map = new Map(state.activeGenerations);
      const existing = map.get(id);
      if (existing) {
        map.set(id, { ...existing, ...updates });
      }
      return { activeGenerations: map };
    }),

  removeGeneration: (id) =>
    set((state) => {
      const map = new Map(state.activeGenerations);
      map.delete(id);
      return { activeGenerations: map };
    }),

  getProcessing: () => {
    const gens = Array.from(get().activeGenerations.values());
    return gens.filter(
      (g) => g.status === "pending" || g.status === "processing"
    );
  },
}));
