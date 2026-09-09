"use client";
// AdminShell — Khung CRM cho khu vực /admin theo chuẩn ZaloCRM / NN/g
import { Suspense, useEffect, useRef, useState, type FormEvent, type ReactNode } from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import {
  IconBell,
  IconChart,
  IconChat,
  IconGrid,
  IconList,
  IconLogout,
  IconPlus,
  IconSettings,
  IconShield,
  IconUsers,
} from "./icons";

type Tab = {
  href: string;
  label: string;
  Icon: (p: { className?: string }) => ReactNode;
  khop: (p: string, tab: string | null) => boolean;
  badge?: number;
};

const TABS: Tab[] = [
  {
    href: "/admin?tab=todo",
    label: "Bàn làm việc",
    Icon: IconGrid,
    khop: (p, t) => p === "/admin" && (!t || t === "todo"),
  },
  {
    href: "/admin?tab=crm",
    label: "Khách hàng & Deals",
    Icon: IconUsers,
    khop: (p, t) => p === "/admin" && t === "crm",
  },
  {
    href: "/admin?tab=ro-hang",
    label: "Rổ hàng",
    Icon: IconList,
    khop: (p, t) => p === "/admin" && (t === "ro-hang" || t === "user" || t === "crawl"),
  },
  {
    href: "/admin?tab=leads",
    label: "Liên hệ & Tin nhắn",
    Icon: IconChat,
    khop: (p, t) => p === "/admin" && t === "leads",
  },
  {
    href: "/admin?tab=agents",
    label: "Môi giới & Chủ nhà",
    Icon: IconShield,
    khop: (p, t) => p === "/admin" && t === "agents",
  },
  {
    href: "/admin?tab=reports",
    label: "Báo cáo tin xấu",
    Icon: IconSettings,
    khop: (p, t) => p === "/admin" && t === "reports",
  },
  {
    href: "/admin?tab=stats",
    label: "Báo cáo thống kê",
    Icon: IconChart,
    khop: (p, t) => p === "/admin" && t === "stats",
  },
];

function ThanhNav() {
  const pathname = usePathname();
  const sp = useSearchParams();
  const router = useRouter();
  const tab = sp.get("tab");
  const [email, setEmail] = useState<string | null>(null);
  const [chuong, setChuong] = useState<{ viec: number; leads: number; reports: number } | null>(null);
  const [q, setQ] = useState(sp.get("q") || "");
  const [moMenu, setMoMenu] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const supabase = createClient();

  useEffect(() => {
    let active = true;
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!active || !user) return;
      setEmail(user.email ?? null);
      try {
        const [v, l, r] = await Promise.all([
          supabase.from("reminders").select("id", { count: "exact", head: true }).eq("status", "pending"),
          supabase.from("leads").select("id", { count: "exact", head: true }),
          supabase.from("listing_reports").select("id", { count: "exact", head: true }).eq("status", "new"),
        ]);
        if (active) {
          setChuong({
            viec: v.count ?? 0,
            leads: l.count ?? 0,
            reports: r.count ?? 0,
          });
        }
      } catch {
        // im lặng nếu bảng chưa có
      }
    });
    return () => {
      active = false;
    };
  }, [pathname]);

  useEffect(() => {
    if (!moMenu) return;
    const dong = (e: MouseEvent) => {
      if (!menuRef.current?.contains(e.target as Node)) setMoMenu(false);
    };
    document.addEventListener("mousedown", dong);
    return () => document.removeEventListener("mousedown", dong);
  }, [moMenu]);

  const tim = (e: FormEvent) => {
    e.preventDefault();
    const k = q.trim();
    const currentTab = tab || "todo";
    router.push(`/admin?tab=${encodeURIComponent(currentTab)}&q=${encodeURIComponent(k)}`);
  };

  const dangXuat = async () => {
    await supabase.auth.signOut();
    location.assign("/");
  };

  const tongChuong = (chuong?.viec ?? 0) + (chuong?.reports ?? 0);

  return (
    <header className="sticky top-0 z-40 border-b border-slate-700/80 bg-[#0b1329] text-white shadow-md">
      <div className="mx-auto flex h-14 max-w-[1600px] items-center gap-2 px-3 sm:px-4">
        {/* Logo & Brand */}
        <Link
          href="/admin"
          className="mr-2 flex items-center gap-2 rounded-lg px-2 py-1 transition hover:bg-white/10"
          aria-label="Về bàn làm việc"
        >
          <div className="grid h-8 w-8 place-items-center rounded-lg bg-emerald-500 font-black text-white shadow-sm">
            NR
          </div>
          <span className="hidden leading-tight md:block">
            <span className="block text-sm font-bold tracking-tight text-white">NhaDat Radar</span>
            <span className="block text-[10px] font-semibold uppercase tracking-wider text-emerald-400">
              CRM Quản trị
            </span>
          </span>
        </Link>

        {/* Navigation Tabs */}
        <nav aria-label="Phân hệ CRM" className="flex min-w-0 flex-1 items-center gap-1 overflow-x-auto py-1 scrollbar-none">
          {TABS.map((t) => {
            const on = t.khop(pathname, tab);
            return (
              <Link
                key={t.href}
                href={t.href}
                aria-current={on ? "page" : undefined}
                className={`flex shrink-0 items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition sm:text-sm ${
                  on
                    ? "bg-emerald-500 text-white shadow-sm"
                    : "text-slate-300 hover:bg-white/10 hover:text-white"
                }`}
              >
                <t.Icon className="h-4 w-4 shrink-0" />
                <span>{t.label}</span>
              </Link>
            );
          })}
        </nav>

        {/* Quick Search */}
        <form onSubmit={tim} role="search" className="hidden lg:block">
          <label className="sr-only" htmlFor="tim-crm">
            Tìm kiếm
          </label>
          <input
            id="tim-crm"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Tìm tên, SĐT, mã BĐS…"
            className="w-48 rounded-lg border border-slate-600/80 bg-slate-800/80 px-3 py-1.5 text-xs text-white placeholder-slate-400 outline-none transition focus:border-emerald-400 focus:bg-slate-800 xl:w-64"
          />
        </form>

        {/* Quick Add Button */}
        <Link
          href="/post"
          className="ml-1 hidden shrink-0 items-center gap-1 rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white shadow-sm transition hover:bg-emerald-500 sm:flex"
        >
          <IconPlus className="h-4 w-4" /> Đăng tin
        </Link>

        {/* Notification Bell */}
        <Link
          href="/admin?tab=todo"
          title={chuong ? `${chuong.viec} việc nhắc nhở · ${chuong.reports} báo cáo tin mới` : "Việc chờ"}
          aria-label="Việc chờ"
          className="relative grid h-9 w-9 shrink-0 place-items-center rounded-lg text-slate-300 transition hover:bg-white/10 hover:text-white"
        >
          <IconBell className="h-5 w-5" />
          {tongChuong > 0 && (
            <span className="absolute right-0.5 top-0.5 min-w-[18px] rounded-full bg-red-500 px-1 text-center text-[10px] font-bold leading-4 text-white shadow-sm">
              {tongChuong > 99 ? "99+" : tongChuong}
            </span>
          )}
        </Link>

        {/* Account Menu */}
        <div ref={menuRef} className="relative shrink-0">
          <button
            type="button"
            onClick={() => setMoMenu((m) => !m)}
            aria-haspopup="menu"
            aria-expanded={moMenu}
            title={email ?? "Tài khoản admin"}
            className="flex h-9 items-center gap-2 rounded-lg px-2 text-slate-200 transition hover:bg-white/10"
          >
            <span className="grid h-7 w-7 place-items-center rounded-full bg-emerald-700 text-xs font-bold uppercase text-white">
              {(email ?? "A").slice(0, 1)}
            </span>
            <span className="hidden max-w-[130px] truncate text-xs text-slate-300 xl:block">
              {email ?? "Admin"}
            </span>
          </button>
          {moMenu && (
            <div
              role="menu"
              className="absolute right-0 mt-2 w-56 rounded-xl border border-slate-200 bg-white p-1.5 text-slate-800 shadow-xl"
            >
              <div className="truncate border-b border-slate-100 px-3 py-2 text-xs text-slate-500">
                {email}
              </div>
              <button
                type="button"
                role="menuitem"
                onClick={dangXuat}
                className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-xs font-semibold text-red-600 transition hover:bg-red-50"
              >
                <IconLogout className="h-4 w-4" /> Đăng xuất
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}

export default function AdminShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <Suspense fallback={<div className="h-14 bg-[#0b1329]" />}>
        <ThanhNav />
      </Suspense>
      <main className="mx-auto max-w-[1600px] px-3 py-5 sm:px-4">{children}</main>
    </div>
  );
}
