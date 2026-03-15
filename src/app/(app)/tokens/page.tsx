"use client";

import { useEffect, useState } from "react";
import { Coins, Zap, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { formatTokens, formatRub } from "@/lib/utils";
import { TOKEN_PACKAGES } from "@/lib/constants/pricing";

export default function TokensPage() {
  const [balance, setBalance] = useState<number | null>(null);
  const [loading, setLoading] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/tokens/balance")
      .then((r) => r.json())
      .then((d) => setBalance(d.balance))
      .catch(() => {});
  }, []);

  async function handlePurchase(packageId: string) {
    setLoading(packageId);
    try {
      const res = await fetch("/api/payments/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ packageId }),
      });
      const data = await res.json();
      if (data.confirmationUrl) {
        window.location.href = data.confirmationUrl;
      }
    } catch {
      setLoading(null);
    }
  }

  return (
    <div className="max-w-4xl mx-auto">
      <h1 className="text-xl font-semibold text-white mb-2">Токены</h1>
      <p className="text-slate-400 mb-8">
        Текущий баланс:{" "}
        <span className="font-medium text-amber-400">
          {balance !== null ? formatTokens(balance) : "..."} токенов
        </span>
      </p>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {TOKEN_PACKAGES.map((pkg, i) => {
          const isPopular = "popular" in pkg && pkg.popular;
          return (
            <Card
              key={pkg.id}
              className={
                isPopular
                  ? "relative border-amber-500/30 bg-amber-500/[0.04] shadow-[0_0_30px_rgba(245,158,11,0.06)]"
                  : ""
              }
            >
              {isPopular && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-gradient-to-r from-amber-400 to-amber-500 text-gray-950 text-xs px-3 py-0.5 rounded-full font-semibold">
                  Популярный
                </div>
              )}
              <CardContent className="py-6 text-center space-y-5">
                <div>
                  <h3 className="font-semibold text-white text-lg">
                    {pkg.name}
                  </h3>
                  <p className="text-3xl font-bold text-white mt-2">
                    {formatRub(pkg.priceRub)}
                  </p>
                </div>

                <div className="space-y-2.5 text-sm">
                  <div className="flex items-center gap-2 justify-center text-slate-300">
                    <Coins className="h-4 w-4 text-amber-400" />
                    <span>
                      {formatTokens(pkg.tokens)} токенов
                    </span>
                  </div>
                  {pkg.bonusTokens > 0 && (
                    <div className="flex items-center gap-2 justify-center text-emerald-400">
                      <Zap className="h-4 w-4" />
                      <span>+{formatTokens(pkg.bonusTokens)} бонус</span>
                    </div>
                  )}
                  <div className="flex items-center gap-2 justify-center text-slate-500">
                    <Sparkles className="h-4 w-4" />
                    <span>{pkg.perToken} ₽/токен</span>
                  </div>
                </div>

                <Button
                  onClick={() => handlePurchase(pkg.id)}
                  loading={loading === pkg.id}
                  className="w-full"
                  variant={isPopular ? "primary" : "secondary"}
                >
                  Купить
                </Button>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <p className="mt-8 text-center text-xs text-slate-500">
        Токены не сгорают. Оплата через банковские карты РФ и СБП.
      </p>
    </div>
  );
}
