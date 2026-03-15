"use client";

import { useEffect, useState } from "react";
import { Image, Video, Mic, Clock } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Spinner } from "@/components/ui/spinner";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";
import type { Generation } from "@/types/database";

const statusLabels: Record<string, { label: string; color: string }> = {
  pending: { label: "Ожидание", color: "text-yellow-400 bg-yellow-500/10 border-yellow-500/20" },
  processing: { label: "Генерация", color: "text-blue-400 bg-blue-500/10 border-blue-500/20" },
  completed: { label: "Готово", color: "text-emerald-400 bg-emerald-500/10 border-emerald-500/20" },
  failed: { label: "Ошибка", color: "text-red-400 bg-red-500/10 border-red-500/20" },
  canceled: { label: "Отменено", color: "text-slate-400 bg-slate-500/10 border-slate-500/20" },
};

const typeIcons = { image: Image, video: Video, audio: Mic };

export default function HistoryPage() {
  const [items, setItems] = useState<Generation[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetch() {
      const supabase = createClient();
      const { data } = await supabase
        .from("generations")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(50);
      setItems(data || []);
      setLoading(false);
    }
    fetch();
  }, []);

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <Spinner />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto">
      <h1 className="text-xl font-semibold text-white mb-6">История генераций</h1>

      {items.length === 0 ? (
        <div className="text-center py-20">
          <Clock className="h-10 w-10 mx-auto mb-3 text-slate-600" />
          <p className="text-slate-500">Пока нет генераций</p>
        </div>
      ) : (
        <div className="space-y-2">
          {items.map((item) => {
            const Icon = typeIcons[item.type as keyof typeof typeIcons] || Image;
            const status = statusLabels[item.status] || statusLabels.pending;
            return (
              <Card key={item.id} className="hover:bg-white/[0.06] transition-colors">
                <CardContent className="py-3 flex items-center gap-4">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/[0.06]">
                    <Icon className="h-4 w-4 text-slate-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-white truncate">{item.prompt}</p>
                    <p className="text-xs text-slate-500">
                      {item.model_id} &middot;{" "}
                      {new Date(item.created_at).toLocaleString("ru-RU")}
                    </p>
                  </div>
                  <span className={cn("text-xs font-medium px-2.5 py-1 rounded-lg border", status.color)}>
                    {status.label}
                  </span>
                  <span className="text-xs text-slate-500 shrink-0 font-mono">
                    {item.token_cost} тк
                  </span>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
