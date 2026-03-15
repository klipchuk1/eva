"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Coins, LogOut } from "lucide-react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { formatTokens } from "@/lib/utils";

export function Header() {
  const router = useRouter();
  const [balance, setBalance] = useState<number | null>(null);

  useEffect(() => {
    async function fetchBalance() {
      try {
        const res = await fetch("/api/tokens/balance");
        if (res.ok) {
          const data = await res.json();
          setBalance(data.balance);
        }
      } catch {
        // Ignore
      }
    }
    fetchBalance();
  }, []);

  async function handleLogout() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  return (
    <header className="sticky top-0 z-30 flex h-14 items-center justify-end border-b border-white/[0.06] bg-[#0a0e1a]/60 backdrop-blur-xl px-6 gap-3">
      {/* Token balance */}
      <Link
        href="/tokens"
        className="flex items-center gap-2 rounded-xl bg-amber-500/10 px-3.5 py-1.5 text-sm font-medium text-amber-400 hover:bg-amber-500/15 transition-all duration-200 border border-amber-500/10"
      >
        <Coins className="h-3.5 w-3.5" />
        {balance !== null ? formatTokens(balance) : "..."}
      </Link>

      {/* Logout */}
      <button
        onClick={handleLogout}
        className="flex items-center justify-center h-8 w-8 rounded-lg text-slate-500 hover:text-slate-300 hover:bg-white/[0.04] transition-all duration-200 cursor-pointer"
      >
        <LogOut className="h-4 w-4" />
      </button>
    </header>
  );
}
