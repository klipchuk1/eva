"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Image, Video, Mic, ArrowRight, Coins, Layers, TrendingUp } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { createClient } from "@/lib/supabase/client";
import { formatTokens } from "@/lib/utils";
import type { Profile } from "@/types/database";

const quickActions = [
  {
    href: "/generate/image",
    icon: Image,
    label: "Генерация фото",
    description: "Создайте изображение по описанию",
    iconColor: "text-blue-400",
    bgColor: "bg-blue-500/10",
    hoverBorder: "hover:border-blue-500/20",
  },
  {
    href: "/generate/video",
    icon: Video,
    label: "Генерация видео",
    description: "Создайте видео из текста",
    iconColor: "text-violet-400",
    bgColor: "bg-violet-500/10",
    hoverBorder: "hover:border-violet-500/20",
  },
  {
    href: "/generate/audio",
    icon: Mic,
    label: "Озвучка текста",
    description: "Превратите текст в речь",
    iconColor: "text-emerald-400",
    bgColor: "bg-emerald-500/10",
    hoverBorder: "hover:border-emerald-500/20",
  },
];

export default function DashboardPage() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [tokensSpent, setTokensSpent] = useState(0);

  useEffect(() => {
    async function fetchData() {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      const { data } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .single();

      if (data) setProfile(data);

      // Sum tokens spent — only completed generations (failed ones get refunded)
      const { data: genData } = await supabase
        .from("generations")
        .select("token_cost")
        .eq("user_id", user.id)
        .eq("status", "completed");

      if (genData) {
        const spent = genData.reduce((sum, g) => sum + (g.token_cost || 0), 0);
        setTokensSpent(spent);
      }
    }
    fetchData();
  }, []);

  return (
    <div className="max-w-5xl mx-auto space-y-8">
      {/* Welcome */}
      <div>
        <h1 className="text-2xl font-semibold text-white">
          {profile?.display_name ? `${profile.display_name},` : ""} добро пожаловать
        </h1>
        <p className="mt-1 text-slate-400">
          Ваш баланс:{" "}
          <span className="font-medium text-amber-400">
            {profile ? formatTokens(profile.token_balance) : "..."} токенов
          </span>
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        {[
          {
            icon: Coins,
            label: "Токенов",
            value: profile ? formatTokens(profile.token_balance) : "—",
            iconColor: "text-amber-400",
            bgColor: "bg-amber-500/10",
          },
          {
            icon: Layers,
            label: "Генераций",
            value: profile?.total_generations?.toString() ?? "—",
            iconColor: "text-blue-400",
            bgColor: "bg-blue-500/10",
          },
          {
            icon: TrendingUp,
            label: "Потрачено",
            value: profile ? `${formatTokens(tokensSpent)} ТК` : "—",
            iconColor: "text-emerald-400",
            bgColor: "bg-emerald-500/10",
          },
        ].map((stat) => (
          <Card key={stat.label}>
            <CardContent className="py-5">
              <div className="flex items-center gap-3">
                <div className={`flex h-9 w-9 items-center justify-center rounded-xl ${stat.bgColor}`}>
                  <stat.icon className={`h-4 w-4 ${stat.iconColor}`} />
                </div>
                <div>
                  <p className="text-2xl font-semibold text-white">
                    {stat.value}
                  </p>
                  <p className="text-xs text-slate-500">{stat.label}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Quick actions */}
      <div>
        <h2 className="text-base font-medium text-slate-300 mb-4">
          Создать
        </h2>
        <div className="grid grid-cols-3 gap-4">
          {quickActions.map((action) => (
            <Link key={action.href} href={action.href}>
              <Card className={`group cursor-pointer h-full hover:bg-white/[0.06] ${action.hoverBorder} transition-all duration-200`}>
                <CardContent className="py-5 space-y-3">
                  <div className={`inline-flex p-2.5 rounded-xl ${action.bgColor}`}>
                    <action.icon className={`h-5 w-5 ${action.iconColor}`} />
                  </div>
                  <div>
                    <h3 className="font-medium text-white flex items-center gap-1.5">
                      {action.label}
                      <ArrowRight className="h-3.5 w-3.5 text-slate-500 group-hover:text-amber-400 group-hover:translate-x-0.5 transition-all" />
                    </h3>
                    <p className="text-sm text-slate-500 mt-0.5">
                      {action.description}
                    </p>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
