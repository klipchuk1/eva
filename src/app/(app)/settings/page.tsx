"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Check } from "lucide-react";

export default function SettingsPage() {
  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    async function fetch() {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      setEmail(user.email || "");

      const { data } = await supabase
        .from("profiles")
        .select("display_name")
        .eq("id", user.id)
        .single();
      if (data) setDisplayName(data.display_name || "");
    }
    fetch();
  }, []);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setSaved(false);

    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    await supabase
      .from("profiles")
      .update({ display_name: displayName })
      .eq("id", user.id);

    setLoading(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  }

  return (
    <div className="max-w-2xl mx-auto">
      <h1 className="text-xl font-semibold text-white mb-6">Настройки</h1>

      <Card>
        <CardHeader>
          <h2 className="font-medium text-white">Профиль</h2>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSave} className="space-y-4">
            <Input
              id="email"
              label="Email"
              value={email}
              disabled
            />
            <Input
              id="name"
              label="Имя"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="Ваше имя"
            />
            <div className="flex items-center gap-3">
              <Button type="submit" loading={loading}>
                Сохранить
              </Button>
              {saved && (
                <span className="flex items-center gap-1.5 text-sm text-emerald-400">
                  <Check className="h-4 w-4" />
                  Сохранено
                </span>
              )}
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
