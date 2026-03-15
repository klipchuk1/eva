"use client";

import { useState } from "react";
import Link from "next/link";
import { Mail } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export default function ResetPasswordPage() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    const supabase = createClient();
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/callback?next=/settings`,
    });

    setLoading(false);

    if (error) {
      setError(error.message);
      return;
    }

    setSent(true);
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#0a0e1a] px-4 relative overflow-hidden">
      <div className="absolute top-[20%] left-[30%] w-[400px] h-[400px] rounded-full bg-amber-500/[0.04] blur-[120px]" />

      <div className="w-full max-w-sm relative z-10">
        <div className="text-center mb-8">
          <div className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-amber-400 to-amber-600 shadow-[0_0_16px_rgba(245,158,11,0.3)] mb-4">
            <span className="text-base font-bold text-gray-950">E</span>
          </div>
          <h1 className="text-2xl font-semibold text-white">Восстановление пароля</h1>
          <p className="mt-2 text-sm text-slate-400">Отправим ссылку на email</p>
        </div>

        <div className="rounded-2xl border border-white/[0.08] bg-white/[0.03] backdrop-blur-sm p-7">
          {sent ? (
            <div className="text-center space-y-4 py-4">
              <div className="inline-flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-400">
                <Mail className="h-6 w-6" />
              </div>
              <p className="text-slate-300">
                Письмо со ссылкой для сброса пароля отправлено на{" "}
                <strong className="text-white">{email}</strong>
              </p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <Input
                id="email"
                label="Email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="your@email.com"
                required
              />

              {error && (
                <p className="text-sm text-red-400 bg-red-500/10 border border-red-500/20 rounded-xl p-3">
                  {error}
                </p>
              )}

              <Button
                type="submit"
                loading={loading}
                className="w-full"
                size="lg"
              >
                Отправить ссылку
              </Button>
            </form>
          )}
        </div>

        <p className="mt-6 text-center text-sm">
          <Link
            href="/login"
            className="text-slate-400 hover:text-amber-400 font-medium transition-colors"
          >
            Вернуться к входу
          </Link>
        </p>
      </div>
    </div>
  );
}
