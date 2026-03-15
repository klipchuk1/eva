"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Image,
  Video,
  Mic,
  LayoutGrid,
  GalleryHorizontalEnd,
  Coins,
  History,
  Settings,
  Tv,
} from "lucide-react";
import { cn } from "@/lib/utils";

const navItems = [
  { href: "/dashboard", label: "Кабинет", icon: LayoutGrid },
  { href: "/generate/image", label: "Фото", icon: Image },
  { href: "/generate/video", label: "Видео", icon: Video },
  { href: "/generate/audio", label: "Аудио", icon: Mic },
  { href: "/gallery", label: "Галерея", icon: GalleryHorizontalEnd },
  { href: "/tv", label: "ЭВА ТВ", icon: Tv },
  { href: "/tokens", label: "Токены", icon: Coins },
  { href: "/history", label: "История", icon: History },
  { href: "/settings", label: "Настройки", icon: Settings },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="fixed left-0 top-0 z-40 flex h-screen w-[260px] flex-col border-r border-white/[0.06] bg-[#0a0e1a]/80 backdrop-blur-xl">
      {/* Logo */}
      <div className="flex h-16 items-center gap-3 px-6">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-amber-400 to-amber-600 shadow-[0_0_12px_rgba(245,158,11,0.3)]">
          <span className="text-sm font-bold text-gray-950">E</span>
        </div>
        <span className="text-lg font-semibold text-white tracking-tight">
          Эва
        </span>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto px-3 py-4">
        <ul className="space-y-0.5">
          {navItems.map((item) => {
            const isActive =
              pathname === item.href ||
              pathname.startsWith(item.href + "/");
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className={cn(
                    "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-200",
                    isActive
                      ? "bg-white/[0.08] text-amber-400 shadow-[inset_0_0_0_1px_rgba(245,158,11,0.15)]"
                      : "text-slate-400 hover:bg-white/[0.04] hover:text-slate-200"
                  )}
                >
                  <item.icon
                    className={cn(
                      "h-[18px] w-[18px]",
                      isActive ? "text-amber-400" : "text-slate-500"
                    )}
                  />
                  {item.label}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      {/* Bottom accent line */}
      <div className="mx-6 mb-6 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />
    </aside>
  );
}
