import { Sidebar } from "@/components/layout/sidebar";
import { Header } from "@/components/layout/header";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-[#0a0e1a] bg-ambient">
      <Sidebar />
      <div className="pl-[260px] relative z-10">
        <Header />
        <main className="p-6">{children}</main>
      </div>
    </div>
  );
}
