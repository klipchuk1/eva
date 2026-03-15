"use client";

import { useEffect, useCallback } from "react";
import { useGenerationStore } from "@/lib/stores/generation-store";
import type { Generation } from "@/types/database";

export function useGenerationPolling() {
  const { activeGenerations, updateGeneration } = useGenerationStore();

  const pollStatus = useCallback(async (id: string) => {
    try {
      const res = await fetch(`/api/generate/status/${id}`);
      if (!res.ok) return;
      const data: Generation = await res.json();
      updateGeneration(id, data);
    } catch {
      // Ignore polling errors
    }
  }, [updateGeneration]);

  useEffect(() => {
    const processingIds = Array.from(activeGenerations.entries())
      .filter(
        ([, g]) => g.status === "pending" || g.status === "processing"
      )
      .map(([id]) => id);

    if (processingIds.length === 0) return;

    const interval = setInterval(() => {
      processingIds.forEach(pollStatus);
    }, 4000);

    return () => clearInterval(interval);
  }, [activeGenerations, pollStatus]);
}

export function useStartGeneration() {
  const { addGeneration } = useGenerationStore();

  return async (
    type: "image" | "video" | "audio",
    body: Record<string, unknown>
  ) => {
    const res = await fetch(`/api/generate/${type}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const error = await res.json();
      throw new Error(error.error || "Generation failed");
    }

    const generation: Generation = await res.json();
    addGeneration(generation);
    return generation;
  };
}
