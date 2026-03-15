import Link from "next/link";
import {
  Image,
  Video,
  Mic,
  ArrowRight,
  Coins,
  Zap,
  Shield,
  Play,
  Sparkles,
  Tv,
} from "lucide-react";

import { ShowcaseFeed } from "@/components/showcase-feed";

/* ───── Stat counter ───── */
function StatItem({ value, label }: { value: string; label: string }) {
  return (
    <div className="text-center">
      <p className="text-3xl md:text-4xl font-bold text-white">{value}</p>
      <p className="text-sm text-slate-400 mt-1">{label}</p>
    </div>
  );
}

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-[#0a0e1a] text-white relative overflow-hidden">
      {/* Ambient background */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-[-20%] left-[10%] w-[600px] h-[600px] rounded-full bg-amber-500/[0.04] blur-[120px]" />
        <div className="absolute top-[30%] right-[5%] w-[500px] h-[500px] rounded-full bg-blue-500/[0.03] blur-[120px]" />
        <div className="absolute bottom-[-10%] left-[40%] w-[400px] h-[400px] rounded-full bg-violet-500/[0.03] blur-[120px]" />
      </div>

      {/* ─── Header ─── */}
      <header className="relative z-10 border-b border-white/[0.06]">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-amber-400 to-amber-600 shadow-[0_0_12px_rgba(245,158,11,0.3)]">
              <span className="text-sm font-bold text-gray-950">E</span>
            </div>
            <span className="text-lg font-semibold tracking-tight">Эва</span>
          </div>
          <div className="flex items-center gap-6">
            <Link
              href="/tv"
              className="inline-flex items-center gap-1.5 text-sm text-amber-400 hover:text-amber-300 transition-colors"
            >
              <Tv className="h-3.5 w-3.5" />
              ЭВА ТВ
            </Link>
            <Link
              href="/tokens"
              className="text-sm text-slate-400 hover:text-white transition-colors"
            >
              Тарифы
            </Link>
            <Link
              href="/login"
              className="text-sm text-slate-400 hover:text-white transition-colors"
            >
              Войти
            </Link>
            <Link
              href="/register"
              className="inline-flex items-center rounded-xl bg-gradient-to-b from-amber-400 to-amber-500 px-4 py-2 text-sm font-medium text-gray-950 hover:from-amber-300 hover:to-amber-400 transition-all shadow-[0_0_16px_rgba(245,158,11,0.25)] hover:shadow-[0_0_24px_rgba(245,158,11,0.35)]"
            >
              Начать бесплатно
            </Link>
          </div>
        </div>
      </header>

      {/* ─── Hero ─── */}
      <section className="relative z-10 pt-24 pb-8 px-6">
        <div className="max-w-4xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-4 py-1.5 text-sm text-slate-300 mb-8 backdrop-blur-sm">
            <div className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
            14+ AI-моделей доступно
          </div>

          <h1 className="text-5xl md:text-7xl font-bold leading-[1.05] tracking-tight">
            Создавайте{" "}
            <span className="text-gradient-hero">невероятное</span>
            <br />
            с помощью ИИ
          </h1>

          <p className="mt-6 text-lg md:text-xl text-slate-400 max-w-2xl mx-auto leading-relaxed">
            Фото, видео, аудио — все лучшие AI-модели в одном месте.
            <br className="hidden md:block" />
            Без VPN. Оплата в рублях. Токены не сгорают.
          </p>

          <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              href="/register"
              className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-b from-amber-400 to-amber-500 px-8 py-3.5 text-base font-semibold text-gray-950 hover:from-amber-300 hover:to-amber-400 transition-all shadow-[0_0_20px_rgba(245,158,11,0.3)] hover:shadow-[0_0_30px_rgba(245,158,11,0.4)] active:scale-[0.98]"
            >
              <Sparkles className="h-4 w-4" />
              Попробовать бесплатно
            </Link>
            <Link
              href="#showcase"
              className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.04] px-7 py-3.5 text-base font-medium text-slate-300 hover:bg-white/[0.08] hover:text-white transition-all backdrop-blur-sm"
            >
              <Play className="h-4 w-4" />
              Смотреть примеры
            </Link>
          </div>
        </div>
      </section>

      {/* ─── Showcase Feed — живая витрина из Civitai ─── */}
      <section id="showcase" className="relative z-10 py-16">
        <ShowcaseFeed />
      </section>

      {/* ─── Stats ─── */}
      <section className="relative z-10 py-16 px-6">
        <div className="max-w-4xl mx-auto">
          <div className="rounded-2xl border border-white/[0.08] bg-white/[0.03] backdrop-blur-sm p-8 md:p-12">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
              <StatItem value="14+" label="AI-моделей" />
              <StatItem value="3" label="Типа контента" />
              <StatItem value="<5с" label="Генерация фото" />
              <StatItem value="₽" label="Оплата в рублях" />
            </div>
          </div>
        </div>
      </section>

      {/* ─── Capabilities (как в Google Flow) ─── */}
      <section className="relative z-10 py-24 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold tracking-tight">
              Три формата — один сервис
            </h2>
            <p className="mt-4 text-slate-400 text-lg">
              Переключайтесь между фото, видео и аудио без лишних инструментов
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              {
                icon: Image,
                title: "Генерация фото",
                desc: "Flux, Ideogram, Seedream, Imagen, Luma, HiDream — 7 топовых моделей для любых задач. До 4K.",
                price: "от 3 токенов",
                gradient: "from-blue-500/20 to-blue-500/0",
                iconColor: "text-blue-400",
                borderColor: "hover:border-blue-500/20",
                href: "/generate/image",
              },
              {
                icon: Video,
                title: "Генерация видео",
                desc: "Kling 3.0, PixVerse, Luma Ray, Wan 2.1 — создавайте видео из текстового описания за минуты.",
                price: "от 40 токенов",
                gradient: "from-violet-500/20 to-violet-500/0",
                iconColor: "text-violet-400",
                borderColor: "hover:border-violet-500/20",
                href: "/generate/video",
              },
              {
                icon: Mic,
                title: "Озвучка текста",
                desc: "Реалистичные голоса на 30+ языках. Идеально для видео, подкастов и рекламы.",
                price: "от 2 токенов",
                gradient: "from-emerald-500/20 to-emerald-500/0",
                iconColor: "text-emerald-400",
                borderColor: "hover:border-emerald-500/20",
                href: "/generate/audio",
              },
            ].map((feature) => (
              <Link key={feature.title} href={feature.href}>
                <div
                  className={`group relative rounded-2xl border border-white/[0.08] bg-white/[0.03] p-7 h-full transition-all duration-300 hover:bg-white/[0.05] ${feature.borderColor} cursor-pointer`}
                >
                  <div
                    className={`absolute inset-0 rounded-2xl bg-gradient-to-b ${feature.gradient} opacity-0 group-hover:opacity-100 transition-opacity duration-300`}
                  />
                  <div className="relative">
                    <div
                      className={`inline-flex p-3 rounded-xl bg-white/[0.06] ${feature.iconColor} mb-5`}
                    >
                      <feature.icon className="h-6 w-6" />
                    </div>
                    <h3 className="text-xl font-semibold text-white flex items-center gap-2">
                      {feature.title}
                      <ArrowRight className="h-4 w-4 text-slate-500 group-hover:text-amber-400 group-hover:translate-x-1 transition-all" />
                    </h3>
                    <p className="mt-3 text-slate-400 leading-relaxed">
                      {feature.desc}
                    </p>
                    <p className="mt-5 text-sm font-medium text-amber-400">
                      {feature.price}
                    </p>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* ─── How it works ─── */}
      <section className="relative z-10 py-24 px-6 border-t border-white/[0.06]">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-3xl font-bold tracking-tight text-center mb-16">
            Как это работает
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              {
                step: "01",
                title: "Опишите идею",
                desc: "Напишите текстовый промпт — подробно или коротко, на русском или английском.",
              },
              {
                step: "02",
                title: "Выберите модель",
                desc: "14+ моделей для разных задач — от быстрых до максимально качественных.",
              },
              {
                step: "03",
                title: "Получите результат",
                desc: "Фото за секунды, видео за минуты. Скачайте или сохраните в галерею.",
              },
            ].map((item) => (
              <div key={item.step} className="relative pl-16">
                <div className="absolute left-0 top-0 flex h-10 w-10 items-center justify-center rounded-xl bg-amber-500/10 border border-amber-500/20">
                  <span className="text-sm font-bold text-amber-400">
                    {item.step}
                  </span>
                </div>
                <h3 className="text-lg font-semibold text-white">
                  {item.title}
                </h3>
                <p className="mt-2 text-slate-400 leading-relaxed">
                  {item.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── Benefits ─── */}
      <section className="relative z-10 py-24 px-6">
        <div className="max-w-5xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-12 text-center">
            {[
              {
                icon: Coins,
                title: "Без подписки",
                desc: "Платите только за то, что используете. Токены никогда не сгорают.",
              },
              {
                icon: Zap,
                title: "Мгновенно",
                desc: "Фото за секунды, видео за минуты. Асинхронная генерация без очередей.",
              },
              {
                icon: Shield,
                title: "Без VPN",
                desc: "Работает из России напрямую. Оплата картами РФ и через СБП.",
              },
            ].map((item) => (
              <div key={item.title} className="space-y-4">
                <div className="inline-flex p-3 rounded-xl bg-white/[0.06]">
                  <item.icon className="h-6 w-6 text-amber-400" />
                </div>
                <h3 className="text-lg font-semibold text-white">
                  {item.title}
                </h3>
                <p className="text-slate-400 leading-relaxed">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── CTA ─── */}
      <section className="relative z-10 py-24 px-6">
        <div className="max-w-3xl mx-auto">
          <div className="relative rounded-3xl border border-white/[0.08] bg-white/[0.03] p-12 text-center overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-b from-amber-500/[0.06] to-transparent" />
            <div className="relative">
              <h2 className="text-3xl font-bold tracking-tight">
                Начните создавать прямо сейчас
              </h2>
              <p className="mt-4 text-slate-400 text-lg">
                Зарегистрируйтесь за 30 секунд и получите первые генерации
              </p>
              <Link
                href="/register"
                className="mt-8 inline-flex items-center gap-2 rounded-xl bg-gradient-to-b from-amber-400 to-amber-500 px-8 py-3.5 text-base font-semibold text-gray-950 hover:from-amber-300 hover:to-amber-400 transition-all shadow-[0_0_20px_rgba(245,158,11,0.3)] hover:shadow-[0_0_30px_rgba(245,158,11,0.4)] active:scale-[0.98]"
              >
                Создать аккаунт <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ─── Footer ─── */}
      <footer className="relative z-10 py-8 border-t border-white/[0.06] px-6">
        <div className="max-w-7xl mx-auto flex items-center justify-between text-sm text-slate-500">
          <div className="flex items-center gap-3">
            <div className="flex h-6 w-6 items-center justify-center rounded-md bg-gradient-to-br from-amber-400 to-amber-600">
              <span className="text-[10px] font-bold text-gray-950">E</span>
            </div>
            <span>Эва</span>
          </div>
          <p>&copy; {new Date().getFullYear()} Эва. Все права защищены.</p>
        </div>
      </footer>

    </div>
  );
}
