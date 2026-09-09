export const dynamic = "force-dynamic";

import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import AdminShell from "@/components/admin/AdminShell";
import { fmtPrice } from "@/lib/format";
import { LISTING_COLS } from "@/lib/cols";
import { REPORT_REASONS } from "@/lib/reports";
import {
  setListingStatus,
  deleteListing,
  setVerified,
  resolveReport,
} from "./actions";
import {
  addBuyer,
  updateBuyer,
  deleteBuyer,
  addSeller,
  updateSeller,
  deleteSeller,
  ganBdsQuanTam,
  xoaBdsQuanTam,
  createDeal,
  updateDealStage,
  deleteDeal,
  createViewing,
  updateViewingStatus,
  createReminder,
  completeReminder,
  deleteReminder,
} from "./crm/actions";
import {
  IconCheck,
  IconClock,
  IconGrid,
  IconHouse,
  IconMoney,
  IconPlus,
  IconSearch,
  IconTarget,
  IconTrash,
  IconUsers,
  IconX,
} from "@/components/admin/icons";

export const metadata = { title: "CRM Quản trị - NhaDat Radar" };

type BuyerRow = {
  id: string;
  name: string;
  phone: string | null;
  zalo_user_id: string | null;
  preferences: Record<string, unknown> | null;
  notes: string | null;
  last_contact_at: string | null;
  created_at: string;
};

type SellerRow = {
  id: string;
  name: string;
  phone: string | null;
  seller_type: string;
  zalo_user_id: string | null;
  active_listing_id: string | null;
  xung_ho: string | null;
  created_at: string;
  listings?: { id: string; title: string; price_vnd: number | null; deal: string } | null;
};

type InterestRow = {
  buyer_id: string;
  listing_id: string;
  created_at: string;
  listings?: { id: string; title: string; price_vnd: number | null; deal: string; district: string | null } | null;
};

type DealRow = {
  id: string;
  listing_id: string;
  buyer_id: string | null;
  stage: string;
  price_vnd: number | null;
  fee_pct: number | null;
  created_at: string;
  closed_at: string | null;
  listings?: { id: string; title: string; price_vnd: number | null; deal: string } | null;
  buyers?: { id: string; name: string; phone: string | null } | null;
};

type ViewingRow = {
  id: string;
  listing_id: string | null;
  buyer_id: string | null;
  slot: string | null;
  time_text: string | null;
  status: string;
  phone: string | null;
  note: string | null;
  created_at: string;
  listings?: { id: string; title: string; district: string | null } | null;
  buyers?: { id: string; name: string; phone: string | null } | null;
};

type ReminderRow = {
  id: string;
  kind: string;
  note: string;
  due_at: string;
  status: string;
  created_at: string;
  buyer_id: string | null;
  listing_id: string | null;
  buyers?: { id: string; name: string } | null;
  listings?: { id: string; title: string } | null;
};

export default async function AdminPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string; q?: string; crm_view?: string; crm_filter?: string }>;
}) {
  const sp = await searchParams;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/auth");

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (profile?.role !== "admin") {
    return (
      <div className="mx-auto mt-16 max-w-md rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-lg">
        <div className="mb-4 text-5xl">🔒</div>
        <h2 className="mb-2 text-xl font-bold text-slate-800">Quyền truy cập bị từ chối</h2>
        <p className="text-sm leading-relaxed text-slate-500">
          Tài khoản <strong>{user.email}</strong> chưa có quyền Admin. Hãy cấp quyền trong Supabase Table
          Editor › <code>profiles</code> › sửa <code>role</code> thành <code>admin</code>.
        </p>
      </div>
    );
  }

  const tab = sp.tab || "todo";
  const admin = createAdminClient();

  // ═════════════════════════════════════════════════════════════════════════════
  // TAB 1: BÀN LÀM VIỆC (TODO / OVERVIEW)
  // ═════════════════════════════════════════════════════════════════════════════
  if (tab === "todo") {
    const [viewingsRes, remindersRes, pendingListingsRes, countsRes, dealsRes] = await Promise.all([
      admin
        .from("viewings")
        .select("id, listing_id, buyer_id, slot, time_text, status, phone, note, created_at, listings(id, title, district), buyers(id, name, phone)")
        .order("created_at", { ascending: false })
        .limit(30),
      admin
        .from("reminders")
        .select("id, kind, note, due_at, status, created_at, buyer_id, listing_id, buyers(id, name), listings(id, title)")
        .eq("status", "pending")
        .order("due_at", { ascending: true })
        .limit(30),
      admin
        .from("listings")
        .select("id, title, price_vnd, deal, district, province, source, created_at")
        .eq("status", "pending")
        .order("created_at", { ascending: false })
        .limit(20),
      Promise.all([
        admin.from("buyers").select("id", { count: "exact", head: true }),
        admin.from("sellers").select("id", { count: "exact", head: true }),
        admin.from("deals").select("id", { count: "exact", head: true }).in("stage", ["lead", "viewing", "negotiating", "closing"]),
        admin.from("listings").select("id", { count: "exact", head: true }).eq("status", "published"),
      ]),
      admin.from("deals").select("id, stage").in("stage", ["lead", "viewing", "negotiating", "closing"]),
    ]);

    const viewings = (viewingsRes.data ?? []) as unknown as ViewingRow[];
    const reminders = (remindersRes.data ?? []) as unknown as ReminderRow[];
    const pendingListings = pendingListingsRes.data ?? [];
    const [buyersCount, sellersCount, activeDealsCount, publishedCount] = countsRes;

    const statusBadge: Record<string, { label: string; class: string }> = {
      proposed: { label: "Đề xuất", class: "bg-amber-100 text-amber-800" },
      pending: { label: "Đã chốt giờ", class: "bg-blue-100 text-blue-800" },
      done: { label: "Đã dẫn xem", class: "bg-emerald-100 text-emerald-800" },
      cancelled: { label: "Đã huỷ", class: "bg-slate-100 text-slate-500" },
    };

    return (
      <AdminShell>
        {/* KPI Cards Header */}
        <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-4">
          <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="text-xs font-medium uppercase tracking-wider text-slate-500">Khách Hàng (CRM)</div>
            <div className="mt-1 flex items-baseline gap-2">
              <span className="text-2xl font-bold text-slate-800">
                {(buyersCount.count ?? 0) + (sellersCount.count ?? 0)}
              </span>
              <span className="text-xs text-slate-500">
                ({buyersCount.count ?? 0} mua · {sellersCount.count ?? 0} bán)
              </span>
            </div>
          </div>
          <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="text-xs font-medium uppercase tracking-wider text-slate-500">Deals Đang Chạy</div>
            <div className="mt-1 flex items-baseline gap-2">
              <span className="text-2xl font-bold text-emerald-600">{activeDealsCount.count ?? 0}</span>
              <span className="text-xs text-slate-500">thương vụ</span>
            </div>
          </div>
          <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="text-xs font-medium uppercase tracking-wider text-slate-500">Việc Nhắc Nhở</div>
            <div className="mt-1 flex items-baseline gap-2">
              <span className="text-2xl font-bold text-amber-600">{reminders.length}</span>
              <span className="text-xs text-slate-500">cần xử lý</span>
            </div>
          </div>
          <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="text-xs font-medium uppercase tracking-wider text-slate-500">Rổ Hàng Đang Bán</div>
            <div className="mt-1 flex items-baseline gap-2">
              <span className="text-2xl font-bold text-blue-600">{publishedCount.count ?? 0}</span>
              <span className="text-xs text-slate-500">tin live</span>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          {/* Cột 1 & 2: Lịch xem nhà & Việc nhắc nhở */}
          <div className="space-y-6 lg:col-span-2">
            {/* Lịch xem nhà */}
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="mb-4 flex items-center justify-between">
                <div>
                  <h2 className="text-base font-bold text-slate-800">🏠 Lịch Hẹn Xem Nhà</h2>
                  <p className="text-xs text-slate-500">Danh sách khách đặt hẹn qua Zalo bot & website</p>
                </div>
                <Link
                  href="/admin?tab=crm"
                  className="text-xs font-semibold text-emerald-600 hover:text-emerald-700"
                >
                  Quản lý CRM ›
                </Link>
              </div>

              {viewings.length ? (
                <div className="divide-y divide-slate-100">
                  {viewings.map((v) => {
                    const badge = statusBadge[v.status] || statusBadge.proposed;
                    return (
                      <div key={v.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
                        <div className="min-w-0 max-w-md">
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-slate-800">
                              {v.buyers?.name || "Khách hẹn"}
                            </span>
                            {(v.phone || v.buyers?.phone) && (
                              <a
                                href={`tel:${v.phone || v.buyers?.phone}`}
                                className="font-mono text-xs font-semibold text-emerald-600 hover:underline"
                              >
                                {v.phone || v.buyers?.phone}
                              </a>
                            )}
                            <span className={`rounded-md px-2 py-0.5 text-[10px] font-bold ${badge.class}`}>
                              {badge.label}
                            </span>
                          </div>
                          <div className="mt-0.5 truncate text-xs text-slate-600">
                            {v.listings ? (
                              <Link
                                href={`/listings/${v.listings.id}`}
                                className="font-medium hover:text-emerald-600"
                              >
                                📍 {v.listings.title} ({v.listings.district || "TP.HCM"})
                              </Link>
                            ) : (
                              <span className="text-slate-400">Không gắn mã căn</span>
                            )}
                          </div>
                          {(v.time_text || v.slot) && (
                            <div className="mt-0.5 text-[11px] text-slate-500">
                              🕒 Giờ hẹn: <span className="font-medium text-slate-700">{v.time_text || (v.slot ? new Date(v.slot).toLocaleString("vi-VN") : "")}</span>
                            </div>
                          )}
                          {v.note && <div className="mt-0.5 text-[11px] italic text-slate-500">"{v.note}"</div>}
                        </div>

                        {/* Quick actions for viewings */}
                        <div className="flex items-center gap-1.5">
                          {v.status !== "done" && (
                            <form action={updateViewingStatus}>
                              <input type="hidden" name="id" value={v.id} />
                              <input type="hidden" name="status" value="done" />
                              <button className="rounded-lg bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700 transition hover:bg-emerald-100">
                                ✓ Đã xem
                              </button>
                            </form>
                          )}
                          {v.status !== "pending" && v.status !== "done" && (
                            <form action={updateViewingStatus}>
                              <input type="hidden" name="id" value={v.id} />
                              <input type="hidden" name="status" value="pending" />
                              <button className="rounded-lg bg-blue-50 px-2.5 py-1 text-xs font-semibold text-blue-700 transition hover:bg-blue-100">
                                Xác nhận
                              </button>
                            </form>
                          )}
                          {v.status !== "cancelled" && (
                            <form action={updateViewingStatus}>
                              <input type="hidden" name="id" value={v.id} />
                              <input type="hidden" name="status" value="cancelled" />
                              <button className="rounded-lg bg-slate-50 px-2.5 py-1 text-xs font-semibold text-slate-500 transition hover:bg-slate-100">
                                Huỷ
                              </button>
                            </form>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="py-8 text-center text-xs text-slate-400">
                  Chưa có lịch hẹn xem nhà nào.
                </div>
              )}
            </div>

            {/* Tin chờ duyệt */}
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="mb-4 flex items-center justify-between">
                <div>
                  <h2 className="text-base font-bold text-slate-800">📋 Tin Chờ Duyệt</h2>
                  <p className="text-xs text-slate-500">Tin đăng từ người dùng hoặc Zalo chờ kiểm duyệt</p>
                </div>
                <Link
                  href="/admin?tab=ro-hang"
                  className="text-xs font-semibold text-emerald-600 hover:text-emerald-700"
                >
                  Xem tất cả rổ hàng ›
                </Link>
              </div>

              {pendingListings.length ? (
                <div className="divide-y divide-slate-100">
                  {pendingListings.map((p) => (
                    <div key={p.id} className="flex flex-wrap items-center justify-between gap-3 py-2.5">
                      <div className="min-w-0 max-w-md">
                        <Link
                          href={`/listings/${p.id}`}
                          className="truncate text-xs font-bold text-slate-800 hover:text-emerald-600"
                        >
                          {p.title}
                        </Link>
                        <div className="text-[11px] text-slate-500">
                          {fmtPrice(p.price_vnd, p.deal)} · {[p.district, p.province].filter(Boolean).join(", ")} · nguồn: {p.source}
                        </div>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <form action={setListingStatus}>
                          <input type="hidden" name="id" value={p.id} />
                          <input type="hidden" name="status" value="published" />
                          <button className="rounded-lg bg-emerald-600 px-2.5 py-1 text-xs font-semibold text-white shadow-sm hover:bg-emerald-500">
                            ✓ Duyệt
                          </button>
                        </form>
                        <form action={deleteListing}>
                          <input type="hidden" name="id" value={p.id} />
                          <button className="rounded-lg bg-red-50 px-2.5 py-1 text-xs font-semibold text-red-600 hover:bg-red-100">
                            Xoá
                          </button>
                        </form>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="py-6 text-center text-xs text-slate-400">
                  Không có tin nào đang chờ duyệt.
                </div>
              )}
            </div>
          </div>

          {/* Cột 3: Việc nhắc nhở (Reminders) & Thêm việc nhanh */}
          <div className="space-y-6">
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-base font-bold text-slate-800">⏰ Việc Cần Làm</h2>
                <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-bold text-amber-800">
                  {reminders.length}
                </span>
              </div>

              {reminders.length ? (
                <div className="space-y-2.5">
                  {reminders.map((r) => (
                    <div
                      key={r.id}
                      className="group flex items-start justify-between gap-2 rounded-xl border border-slate-100 bg-slate-50/70 p-3 transition hover:border-slate-200 hover:bg-white"
                    >
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className="rounded bg-slate-200 px-1.5 py-0.5 text-[9px] font-bold uppercase text-slate-600">
                            {r.kind}
                          </span>
                          <span className="text-[10px] text-slate-400">
                            {new Date(r.due_at).toLocaleDateString("vi-VN")}
                          </span>
                        </div>
                        <div className="mt-1 text-xs font-medium text-slate-700">{r.note}</div>
                        {r.buyers && (
                          <div className="mt-0.5 text-[10px] text-emerald-600 font-semibold">
                            Khách: {r.buyers.name}
                          </div>
                        )}
                      </div>
                      <div className="flex shrink-0 items-center gap-1">
                        <form action={completeReminder}>
                          <input type="hidden" name="id" value={r.id} />
                          <button
                            title="Đánh dấu hoàn thành"
                            className="grid h-7 w-7 place-items-center rounded-lg bg-emerald-100 text-emerald-700 transition hover:bg-emerald-200"
                          >
                            <IconCheck className="h-4 w-4" />
                          </button>
                        </form>
                        <form action={deleteReminder}>
                          <input type="hidden" name="id" value={r.id} />
                          <button
                            title="Xoá việc"
                            className="grid h-7 w-7 place-items-center rounded-lg text-slate-400 transition hover:bg-slate-100 hover:text-slate-600"
                          >
                            <IconTrash className="h-3.5 w-3.5" />
                          </button>
                        </form>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="py-8 text-center text-xs text-slate-400">
                  Không có việc nhắc nhở nào đang chờ!
                </div>
              )}

              {/* Form thêm việc nhanh */}
              <form action={createReminder} className="mt-4 border-t border-slate-100 pt-3">
                <input
                  type="text"
                  name="note"
                  required
                  placeholder="Ghi chú việc cần làm…"
                  className="mb-2 w-full rounded-lg border border-slate-200 px-3 py-1.5 text-xs outline-none focus:border-emerald-500"
                />
                <div className="flex gap-2">
                  <select
                    name="kind"
                    className="rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs outline-none focus:border-emerald-500"
                  >
                    <option value="follow_up">Follow-up</option>
                    <option value="viewing">Xem nhà</option>
                    <option value="promise">Lời hứa</option>
                  </select>
                  <input
                    type="date"
                    name="due_at"
                    className="flex-1 rounded-lg border border-slate-200 px-2 py-1 text-xs outline-none focus:border-emerald-500"
                  />
                  <button
                    type="submit"
                    className="rounded-lg bg-slate-800 px-3 py-1 text-xs font-semibold text-white transition hover:bg-slate-700"
                  >
                    + Thêm
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      </AdminShell>
    );
  }

  // ═════════════════════════════════════════════════════════════════════════════
  // TAB 2: KHÁCH HÀNG & DEALS PIPELINE (CRM)
  // ═════════════════════════════════════════════════════════════════════════════
  if (tab === "crm") {
    const crmView = sp.crm_view || "customers"; // 'customers' | 'pipeline'
    const crmFilter = sp.crm_filter || "all"; // 'all' | 'buyer' | 'seller' | 'dual'

    const [buyersRes, sellersRes, interestsRes, dealsRes, listingsRes] = await Promise.all([
      admin.from("buyers").select("*").order("created_at", { ascending: false }).limit(100),
      admin
        .from("sellers")
        .select("id, name, phone, seller_type, zalo_user_id, active_listing_id, xung_ho, created_at, listings:active_listing_id(id, title, price_vnd, deal)")
        .order("created_at", { ascending: false })
        .limit(100),
      admin
        .from("interests")
        .select("buyer_id, listing_id, created_at, listings(id, title, price_vnd, deal, district)"),
      admin
        .from("deals")
        .select("id, listing_id, buyer_id, stage, price_vnd, fee_pct, created_at, closed_at, listings(id, title, price_vnd, deal), buyers(id, name, phone)")
        .order("created_at", { ascending: false }),
      admin.from("listings").select("id, title, price_vnd, deal").eq("status", "published").limit(200),
    ]);

    const rawBuyers = (buyersRes.data ?? []) as BuyerRow[];
    const rawSellers = (sellersRes.data ?? []) as unknown as SellerRow[];
    const rawInterests = (interestsRes.data ?? []) as unknown as InterestRow[];
    const rawDeals = (dealsRes.data ?? []) as unknown as DealRow[];
    const availableListings = listingsRes.data ?? [];

    // Gộp khách hàng 2 vai (mua & bán) qua Zalo ID hoặc SĐT
    type CombinedCustomer = {
      id: string;
      name: string;
      phone: string | null;
      zalo_user_id: string | null;
      role: "buyer" | "seller" | "dual";
      buyer?: BuyerRow | null;
      seller?: SellerRow | null;
      interests: InterestRow[];
      notes: string | null;
      created_at: string;
    };

    const customers: CombinedCustomer[] = [];
    const pairedSellerIds = new Set<string>();

    for (const b of rawBuyers) {
      const s = rawSellers.find(
        (x) =>
          (b.zalo_user_id && x.zalo_user_id === b.zalo_user_id) ||
          (b.phone && x.phone && b.phone === x.phone)
      );
      if (s) pairedSellerIds.add(s.id);

      const bInterests = rawInterests.filter((i) => i.buyer_id === b.id);
      customers.push({
        id: b.id,
        name: b.name || s?.name || "Khách hàng",
        phone: b.phone || s?.phone || null,
        zalo_user_id: b.zalo_user_id || s?.zalo_user_id || null,
        role: s ? "dual" : "buyer",
        buyer: b,
        seller: s ?? null,
        interests: bInterests,
        notes: b.notes,
        created_at: b.created_at,
      });
    }

    // Các sellers độc lập (chưa mua)
    for (const s of rawSellers) {
      if (!pairedSellerIds.has(s.id)) {
        customers.push({
          id: s.id,
          name: s.name || "Chủ nhà / Môi giới",
          phone: s.phone,
          zalo_user_id: s.zalo_user_id,
          role: "seller",
          buyer: null,
          seller: s,
          interests: [],
          notes: null,
          created_at: s.created_at,
        });
      }
    }

    // Lọc theo crmFilter và tìm kiếm từ khoá sp.q
    let filteredCustomers = customers;
    if (crmFilter === "buyer") filteredCustomers = filteredCustomers.filter((c) => c.role === "buyer");
    if (crmFilter === "seller") filteredCustomers = filteredCustomers.filter((c) => c.role === "seller");
    if (crmFilter === "dual") filteredCustomers = filteredCustomers.filter((c) => c.role === "dual");

    if (sp.q) {
      const query = sp.q.toLowerCase().trim();
      filteredCustomers = filteredCustomers.filter(
        (c) =>
          c.name.toLowerCase().includes(query) ||
          (c.phone && c.phone.includes(query)) ||
          (c.zalo_user_id && c.zalo_user_id.toLowerCase().includes(query)) ||
          (c.notes && c.notes.toLowerCase().includes(query))
      );
    }

    // ── Pipeline Stages Definition ──
    const STAGES = [
      { key: "lead", title: "Tiếp cận", color: "border-slate-300 bg-slate-50 text-slate-700" },
      { key: "viewing", title: "Hẹn xem nhà", color: "border-blue-300 bg-blue-50 text-blue-700" },
      { key: "negotiating", title: "Đàm phán", color: "border-amber-300 bg-amber-50 text-amber-700" },
      { key: "closing", title: "Đặt cọc", color: "border-purple-300 bg-purple-50 text-purple-700" },
      { key: "won", title: "Thành công", color: "border-emerald-300 bg-emerald-50 text-emerald-700" },
      { key: "lost", title: "Huỷ / Mất", color: "border-red-300 bg-red-50 text-red-700" },
    ];

    return (
      <AdminShell>
        {/* CRM Sub-Header & Controls */}
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-xl font-bold text-slate-800">Quản Lý Khách Hàng & Deals</h1>
            <p className="text-xs text-slate-500">
              Khách hàng hai vai (vừa mua vừa bán), gắn BĐS quan tâm & phễu thương vụ
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Switch View */}
            <div className="flex rounded-lg border border-slate-200 bg-white p-0.5 shadow-sm">
              <Link
                href="/admin?tab=crm&crm_view=customers"
                className={`rounded-md px-3 py-1.5 text-xs font-semibold transition ${
                  crmView === "customers" ? "bg-emerald-500 text-white shadow-xs" : "text-slate-600 hover:text-slate-900"
                }`}
              >
                👥 Danh Sách Khách ({filteredCustomers.length})
              </Link>
              <Link
                href="/admin?tab=crm&crm_view=pipeline"
                className={`rounded-md px-3 py-1.5 text-xs font-semibold transition ${
                  crmView === "pipeline" ? "bg-emerald-500 text-white shadow-xs" : "text-slate-600 hover:text-slate-900"
                }`}
              >
                💼 Phễu Deals ({rawDeals.length})
              </Link>
            </div>
          </div>
        </div>

        {/* ═════════════════════════════════════════════════════════════════════
            VIEW 1: DANH SÁCH KHÁCH HÀNG (BUYERS & SELLERS)
        ═══════════════════════════════════════════════════════════════════════ */}
        {crmView === "customers" && (
          <div className="space-y-5">
            {/* Filter Bar */}
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="text-xs font-semibold text-slate-500">Lọc theo vai:</span>
                {[
                  { key: "all", label: "Tất cả" },
                  { key: "dual", label: "Hai vai (vừa mua vừa bán)" },
                  { key: "buyer", label: "Chỉ mua" },
                  { key: "seller", label: "Chỉ bán" },
                ].map((f) => (
                  <Link
                    key={f.key}
                    href={`/admin?tab=crm&crm_view=customers&crm_filter=${f.key}${sp.q ? `&q=${sp.q}` : ""}`}
                    className={`rounded-lg px-2.5 py-1 text-xs font-medium transition ${
                      crmFilter === f.key
                        ? "bg-slate-900 text-white"
                        : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                    }`}
                  >
                    {f.label}
                  </Link>
                ))}
              </div>

              {/* Form tìm kiếm */}
              <form action="/admin" className="flex items-center gap-1.5">
                <input type="hidden" name="tab" value="crm" />
                <input type="hidden" name="crm_view" value="customers" />
                <input type="hidden" name="crm_filter" value={crmFilter} />
                <input
                  name="q"
                  defaultValue={sp.q}
                  placeholder="Tìm tên, SĐT, Zalo ID…"
                  className="rounded-lg border border-slate-200 px-3 py-1 text-xs outline-none focus:border-emerald-500"
                />
                <button
                  type="submit"
                  className="rounded-lg bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-200"
                >
                  Lọc
                </button>
              </form>
            </div>

            {/* Quick Add Customer Accordion/Card */}
            <details className="group rounded-2xl border border-dashed border-emerald-300 bg-emerald-50/50 p-4 shadow-sm">
              <summary className="cursor-pointer font-bold text-xs text-emerald-800 flex items-center justify-between">
                <span>➕ Thêm Khách Hàng Mới Vào CRM</span>
                <span className="text-xs text-emerald-600 group-open:rotate-180 transition">▼</span>
              </summary>
              <form action={addBuyer} className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-3">
                <div>
                  <label className="mb-1 block text-[11px] font-semibold text-slate-600">Họ và tên</label>
                  <input
                    name="name"
                    required
                    placeholder="VD: Anh Tuấn Quận 5"
                    className="w-full rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs outline-none focus:border-emerald-500"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-[11px] font-semibold text-slate-600">Số điện thoại</label>
                  <input
                    name="phone"
                    placeholder="0903xxxxxx"
                    className="w-full rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs outline-none focus:border-emerald-500"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-[11px] font-semibold text-slate-600">Zalo User ID</label>
                  <input
                    name="zalo_user_id"
                    placeholder="Zalo ID hoặc username"
                    className="w-full rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs outline-none focus:border-emerald-500"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-[11px] font-semibold text-slate-600">Khu vực tìm kiếm</label>
                  <input
                    name="district"
                    placeholder="VD: Quận 5, Quận 10"
                    className="w-full rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs outline-none focus:border-emerald-500"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-[11px] font-semibold text-slate-600">Ngân sách dự kiến</label>
                  <input
                    name="budget"
                    placeholder="VD: 5 - 7 tỷ"
                    className="w-full rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs outline-none focus:border-emerald-500"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-[11px] font-semibold text-slate-600">Loại BĐS quan tâm</label>
                  <select
                    name="property_type"
                    className="w-full rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs outline-none focus:border-emerald-500"
                  >
                    <option value="nha_pho">Nhà phố / Thổ cư</option>
                    <option value="chung_cu">Căn hộ / Chung cư</option>
                    <option value="dat">Đất nền</option>
                    <option value="mat_bang">Mặt bằng kinh doanh</option>
                  </select>
                </div>
                <div className="sm:col-span-2">
                  <label className="mb-1 block text-[11px] font-semibold text-slate-600">Ghi chú nhu cầu</label>
                  <input
                    name="notes"
                    placeholder="VD: Cần hẻm xe hơi, mua trước Tết, tài chính sẵn"
                    className="w-full rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs outline-none focus:border-emerald-500"
                  />
                </div>
                <div className="flex items-end">
                  <button
                    type="submit"
                    className="w-full rounded-lg bg-emerald-600 px-4 py-1.5 text-xs font-bold text-white shadow-sm transition hover:bg-emerald-500"
                  >
                    Lưu Hồ Sơ Khách
                  </button>
                </div>
              </form>
            </details>

            {/* Customers Grid */}
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
              {filteredCustomers.length ? (
                filteredCustomers.map((c) => {
                  const p = (c.buyer?.preferences ?? {}) as Record<string, string>;
                  return (
                    <div
                      key={c.id}
                      className="flex flex-col justify-between rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:border-slate-300"
                    >
                      <div>
                        {/* Card Header: Tên, Vai, Zalo/Phone */}
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <div className="flex items-center gap-2">
                              <h3 className="text-base font-bold text-slate-800">{c.name}</h3>
                              <span
                                className={`rounded-md px-2 py-0.5 text-[10px] font-bold ${
                                  c.role === "dual"
                                    ? "bg-purple-100 text-purple-800"
                                    : c.role === "buyer"
                                    ? "bg-blue-100 text-blue-800"
                                    : "bg-emerald-100 text-emerald-800"
                                }`}
                              >
                                {c.role === "dual"
                                  ? "Khách hai vai 🔄"
                                  : c.role === "buyer"
                                  ? "Khách mua"
                                  : c.seller?.seller_type === "ccrb"
                                  ? "Chính chủ rao bán"
                                  : "Môi giới"}
                              </span>
                            </div>

                            <div className="mt-1 flex flex-wrap items-center gap-3 text-xs text-slate-500">
                              {c.phone && (
                                <a
                                  href={`tel:${c.phone}`}
                                  className="font-mono font-semibold text-emerald-600 hover:underline"
                                >
                                  📞 {c.phone}
                                </a>
                              )}
                              {c.zalo_user_id && (
                                <a
                                  href={`https://zalo.me/${encodeURIComponent(c.zalo_user_id)}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="font-semibold text-blue-600 hover:underline"
                                >
                                  💬 Chat Zalo
                                </a>
                              )}
                            </div>
                          </div>

                          <div className="flex items-center gap-1">
                            {c.buyer && (
                              <form action={deleteBuyer}>
                                <input type="hidden" name="id" value={c.buyer.id} />
                                <button
                                  title="Xoá khách mua"
                                  className="grid h-7 w-7 place-items-center rounded-lg text-slate-400 hover:bg-red-50 hover:text-red-600"
                                >
                                  <IconTrash className="h-3.5 w-3.5" />
                                </button>
                              </form>
                            )}
                            {c.seller && (
                              <form action={deleteSeller}>
                                <input type="hidden" name="id" value={c.seller.id} />
                                <button
                                  title="Xoá người bán"
                                  className="grid h-7 w-7 place-items-center rounded-lg text-slate-400 hover:bg-red-50 hover:text-red-600"
                                >
                                  <IconTrash className="h-3.5 w-3.5" />
                                </button>
                              </form>
                            )}
                          </div>
                        </div>

                        {/* Nhu cầu & Ghi chú */}
                        <div className="mt-3 rounded-xl bg-slate-50 p-3 text-xs">
                          {c.buyer && (
                            <div className="space-y-1">
                              <div className="font-semibold text-slate-700">🎯 Nhu cầu tìm kiếm:</div>
                              <div className="flex flex-wrap gap-x-4 gap-y-1 text-slate-600">
                                {p.budget && <span>💰 Ngân sách: <strong>{p.budget}</strong></span>}
                                {p.district && <span>📍 Khu vực: <strong>{p.district}</strong></span>}
                                {p.property_type && <span>🏠 Loại BĐS: <strong>{p.property_type}</strong></span>}
                              </div>
                              {c.notes && (
                                <div className="mt-1 italic text-slate-500">"{c.notes}"</div>
                              )}
                            </div>
                          )}

                          {c.seller?.listings && (
                            <div className="mt-2 border-t border-slate-200/60 pt-2">
                              <div className="font-semibold text-slate-700">🏷️ BĐS đang gửi bán:</div>
                              <Link
                                href={`/listings/${c.seller.listings.id}`}
                                className="font-medium text-emerald-700 hover:underline"
                              >
                                {c.seller.listings.title} (
                                {fmtPrice(c.seller.listings.price_vnd, c.seller.listings.deal)})
                              </Link>
                            </div>
                          )}
                        </div>

                        {/* BĐS Quan Tâm (Interests) */}
                        <div className="mt-3">
                          <div className="mb-1.5 flex items-center justify-between text-xs font-semibold text-slate-700">
                            <span>⭐ BĐS Khách Quan Tâm ({c.interests.length})</span>
                          </div>

                          {c.interests.length > 0 ? (
                            <div className="flex flex-wrap gap-1.5">
                              {c.interests.map((i) => (
                                <span
                                  key={i.listing_id}
                                  className="group inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-xs shadow-2xs"
                                >
                                  <Link
                                    href={`/listings/${i.listing_id}`}
                                    className="max-w-[200px] truncate font-medium text-slate-800 hover:text-emerald-600"
                                  >
                                    {i.listings?.title || i.listing_id.slice(0, 8)}
                                  </Link>
                                  {c.buyer && (
                                    <form action={xoaBdsQuanTam}>
                                      <input type="hidden" name="buyer_id" value={c.buyer.id} />
                                      <input type="hidden" name="listing_id" value={i.listing_id} />
                                      <button
                                        title="Gỡ BĐS này"
                                        className="text-slate-400 hover:text-red-500"
                                      >
                                        ✕
                                      </button>
                                    </form>
                                  )}
                                </span>
                              ))}
                            </div>
                          ) : (
                            <p className="text-[11px] text-slate-400">Chưa gắn BĐS quan tâm nào</p>
                          )}

                          {/* Quick attach form */}
                          {c.buyer && (
                            <form action={ganBdsQuanTam} className="mt-2 flex items-center gap-1.5">
                              <input type="hidden" name="buyer_id" value={c.buyer.id} />
                              <input
                                name="listing_code_or_id"
                                required
                                placeholder="Gõ tên hoặc mã BĐS…"
                                className="flex-1 rounded-lg border border-slate-200 px-2.5 py-1 text-xs outline-none focus:border-emerald-500"
                              />
                              <button
                                type="submit"
                                className="rounded-lg bg-slate-800 px-2.5 py-1 text-xs font-semibold text-white hover:bg-slate-700"
                              >
                                + Gắn
                              </button>
                            </form>
                          )}
                        </div>
                      </div>

                      {/* Quick Deal creation & Viewing links */}
                      <div className="mt-4 flex flex-wrap items-center justify-between border-t border-slate-100 pt-3">
                        <span className="text-[10px] text-slate-400">
                          Tạo ngày {new Date(c.created_at).toLocaleDateString("vi-VN")}
                        </span>

                        <div className="flex items-center gap-2">
                          <Link
                            href={`/admin?tab=crm&crm_view=pipeline`}
                            className="rounded-lg bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700 transition hover:bg-emerald-100"
                          >
                            + Tạo Deal
                          </Link>
                        </div>
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="col-span-full rounded-2xl border border-slate-200 bg-white p-12 text-center text-sm text-slate-400">
                  Không tìm thấy khách hàng nào phù hợp bộ lọc.
                </div>
              )}
            </div>
          </div>
        )}

        {/* ═════════════════════════════════════════════════════════════════════
            VIEW 2: PIPELINE THƯƠNG VỤ (DEALS KANBAN)
        ═══════════════════════════════════════════════════════════════════════ */}
        {crmView === "pipeline" && (
          <div className="space-y-6">
            {/* Quick Add Deal Form */}
            <details className="group rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
              <summary className="cursor-pointer font-bold text-xs text-slate-800 flex items-center justify-between">
                <span>➕ Tạo Thương Vụ Mới Vào Phễu</span>
                <span className="text-xs text-slate-400 group-open:rotate-180 transition">▼</span>
              </summary>
              <form action={createDeal} className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-4">
                <div>
                  <label className="mb-1 block text-[11px] font-semibold text-slate-600">Chọn BĐS</label>
                  <select
                    name="listing_id"
                    required
                    className="w-full rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs outline-none focus:border-emerald-500"
                  >
                    <option value="">-- Chọn BĐS trong rổ hàng --</option>
                    {availableListings.map((l) => (
                      <option key={l.id} value={l.id}>
                        {l.title} ({fmtPrice(l.price_vnd, l.deal)})
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="mb-1 block text-[11px] font-semibold text-slate-600">Khách mua (tuỳ chọn)</label>
                  <select
                    name="buyer_id"
                    className="w-full rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs outline-none focus:border-emerald-500"
                  >
                    <option value="">-- Chọn khách mua --</option>
                    {rawBuyers.map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.name} {b.phone ? `(${b.phone})` : ""}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="mb-1 block text-[11px] font-semibold text-slate-600">Giai đoạn ban đầu</label>
                  <select
                    name="stage"
                    className="w-full rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs outline-none focus:border-emerald-500"
                  >
                    {STAGES.map((s) => (
                      <option key={s.key} value={s.key}>
                        {s.title}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="flex items-end">
                  <button
                    type="submit"
                    className="w-full rounded-lg bg-emerald-600 px-4 py-1.5 text-xs font-bold text-white shadow-sm transition hover:bg-emerald-500"
                  >
                    + Khởi Tạo Deal
                  </button>
                </div>
              </form>
            </details>

            {/* Pipeline Columns */}
            <div className="grid grid-cols-1 gap-4 overflow-x-auto pb-4 md:grid-cols-3 lg:grid-cols-6">
              {STAGES.map((col) => {
                const colDeals = rawDeals.filter((d) => d.stage === col.key);
                return (
                  <div
                    key={col.key}
                    className="flex flex-col rounded-2xl border border-slate-200 bg-slate-100/60 p-3"
                  >
                    {/* Column Header */}
                    <div className="mb-3 flex items-center justify-between">
                      <span className={`rounded-lg border px-2 py-0.5 text-xs font-bold ${col.color}`}>
                        {col.title}
                      </span>
                      <span className="text-xs font-bold text-slate-500">{colDeals.length}</span>
                    </div>

                    {/* Deal Cards in column */}
                    <div className="flex-1 space-y-2.5">
                      {colDeals.length ? (
                        colDeals.map((d) => (
                          <div
                            key={d.id}
                            className="rounded-xl border border-slate-200 bg-white p-3 shadow-xs transition hover:border-emerald-300"
                          >
                            <Link
                              href={`/listings/${d.listing_id}`}
                              className="line-clamp-2 text-xs font-bold text-slate-800 hover:text-emerald-600"
                            >
                              {d.listings?.title || "BĐS"}
                            </Link>

                            <div className="mt-1 text-xs font-semibold text-emerald-600">
                              {fmtPrice(d.price_vnd || d.listings?.price_vnd, d.listings?.deal || "ban")}
                            </div>

                            {d.buyers && (
                              <div className="mt-1 text-[11px] text-slate-600">
                                👤 {d.buyers.name} {d.buyers.phone ? `(${d.buyers.phone})` : ""}
                              </div>
                            )}

                            {/* Move Stage controls */}
                            <div className="mt-2.5 flex items-center justify-between border-t border-slate-100 pt-2">
                              <form action={updateDealStage} className="flex-1">
                                <input type="hidden" name="id" value={d.id} />
                                <select
                                  name="stage"
                                  defaultValue={d.stage}
                                  // @ts-expect-error form submission
                                  onChange={(e) => e.target.form.requestSubmit()}
                                  className="w-full rounded border border-slate-200 bg-slate-50 px-1 py-0.5 text-[10px] font-semibold text-slate-600 outline-none"
                                >
                                  {STAGES.map((s) => (
                                    <option key={s.key} value={s.key}>
                                      Chuyển › {s.title}
                                    </option>
                                  ))}
                                </select>
                              </form>

                              <form action={deleteDeal} className="ml-1">
                                <input type="hidden" name="id" value={d.id} />
                                <button
                                  title="Xoá deal"
                                  className="text-slate-300 hover:text-red-500"
                                >
                                  ✕
                                </button>
                              </form>
                            </div>
                          </div>
                        ))
                      ) : (
                        <div className="py-8 text-center text-[11px] text-slate-400">Trống</div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </AdminShell>
    );
  }

  // ═════════════════════════════════════════════════════════════════════════════
  // TAB 3: RỔ HÀNG (RO-HANG / USER / CRAWL)
  // ═════════════════════════════════════════════════════════════════════════════
  if (tab === "ro-hang" || tab === "user" || tab === "crawl") {
    const subTab = tab === "crawl" ? "crawl" : "user";
    let query = admin.from("listings").select(LISTING_COLS).order("created_at", { ascending: false }).limit(60);
    query = subTab === "user" ? query.neq("source", "crawl") : query.eq("source", "crawl");
    if (sp.q) query = query.ilike("title", `%${sp.q}%`);
    const { data: rows } = await query;
    const listings = rows ?? [];

    const badge: Record<string, string> = {
      published: "text-emerald-700 bg-emerald-100",
      pending: "text-amber-700 bg-amber-100",
      hidden: "text-slate-600 bg-slate-100",
      rejected: "text-red-700 bg-red-100",
    };

    return (
      <AdminShell>
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div className="flex gap-2">
            <Link
              href={`/admin?tab=user${sp.q ? `&q=${sp.q}` : ""}`}
              className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                subTab === "user" ? "bg-slate-900 text-white" : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-50"
              }`}
            >
              Tin Người Dùng / Bot Đăng
            </Link>
            <Link
              href={`/admin?tab=crawl${sp.q ? `&q=${sp.q}` : ""}`}
              className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                subTab === "crawl" ? "bg-slate-900 text-white" : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-50"
              }`}
            >
              Tin Cào Hệ Thống (Crawl)
            </Link>
          </div>

          <form action="/admin" className="flex gap-2">
            <input type="hidden" name="tab" value={subTab} />
            <input
              className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs outline-none focus:border-emerald-500"
              name="q"
              defaultValue={sp.q}
              placeholder="Tìm tiêu đề BĐS…"
            />
            <button className="rounded-lg bg-slate-800 px-3 py-1.5 text-xs font-semibold text-white hover:bg-slate-700" type="submit">
              Tìm
            </button>
          </form>
        </div>

        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          {listings.length ? (
            listings.map((x) => (
              <div
                key={x.id}
                className="flex flex-wrap items-center gap-x-3 gap-y-1.5 border-b border-slate-100 px-4 py-3 text-sm last:border-0 hover:bg-slate-50/50"
              >
                <span className={`rounded px-1.5 py-0.5 text-[10px] font-bold uppercase ${badge[x.status] || ""}`}>
                  {x.status}
                </span>
                <Link
                  href={`/listings/${x.id}`}
                  className="max-w-[400px] truncate font-semibold text-slate-800 hover:text-emerald-600"
                >
                  {x.title}
                </Link>
                <span className="text-xs text-slate-500">
                  {fmtPrice(x.price_vnd, x.deal)} · {[x.district, x.province].filter(Boolean).join(", ")} · {x.source === "crawl" ? x.source_site : "tự đăng"}
                </span>
                <span className="ml-auto flex gap-1.5">
                  {x.status !== "published" && (
                    <form action={setListingStatus}>
                      <input type="hidden" name="id" value={x.id} />
                      <input type="hidden" name="status" value="published" />
                      <button className="rounded-lg bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700 hover:bg-emerald-100">
                        ✓ Duyệt
                      </button>
                    </form>
                  )}
                  {x.status === "published" && (
                    <form action={setListingStatus}>
                      <input type="hidden" name="id" value={x.id} />
                      <input type="hidden" name="status" value="hidden" />
                      <button className="rounded-lg bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-600 hover:bg-slate-200">
                        Ẩn
                      </button>
                    </form>
                  )}
                  <form action={deleteListing}>
                    <input type="hidden" name="id" value={x.id} />
                    <button className="rounded-lg bg-red-50 px-2.5 py-1 text-xs font-semibold text-red-600 hover:bg-red-100">
                      Xoá
                    </button>
                  </form>
                </span>
              </div>
            ))
          ) : (
            <p className="p-8 text-center text-sm text-slate-400">Không có tin nào.</p>
          )}
        </div>
      </AdminShell>
    );
  }

  // ═════════════════════════════════════════════════════════════════════════════
  // TAB 4: LIÊN HỆ & LEADS
  // ═════════════════════════════════════════════════════════════════════════════
  if (tab === "leads") {
    type LeadRow = {
      id: string;
      name: string;
      phone: string;
      message: string | null;
      listing_id: string | null;
      project_id: string | null;
      created_at: string;
    };
    const { data: leadsData } = await admin.from("leads").select("*").order("created_at", { ascending: false }).limit(100);
    const leads = (leadsData ?? []) as LeadRow[];

    const projIds = [...new Set(leads.map((l) => l.project_id).filter(Boolean))] as string[];
    const { data: projRows } = projIds.length
      ? await admin.from("projects").select("id,name").in("id", projIds)
      : { data: [] as { id: string; name: string }[] };
    const projMap = new Map((projRows ?? []).map((p2) => [p2.id, p2.name]));

    return (
      <AdminShell>
        <div className="mb-4">
          <h1 className="text-xl font-bold text-slate-800">Liên Hệ & Khách Để Lại Thông Tin</h1>
          <p className="text-xs text-slate-500">Các yêu cầu liên hệ từ trang chi tiết BĐS và Dự án</p>
        </div>

        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          {leads.length ? (
            leads.map((l) => (
              <div
                key={l.id}
                className="flex flex-wrap items-center gap-x-3 gap-y-1 border-b border-slate-100 px-4 py-3 text-sm last:border-0"
              >
                <span className="font-semibold text-slate-800">{l.name}</span>
                <a href={`tel:${l.phone}`} className="font-mono text-xs font-semibold text-emerald-600 hover:underline">
                  📞 {l.phone}
                </a>
                {l.message && <span className="max-w-[420px] truncate text-xs text-slate-500">“{l.message}”</span>}
                {l.listing_id ? (
                  <Link href={`/listings/${l.listing_id}`} className="text-xs font-semibold text-emerald-600 hover:underline">
                    Xem tin BĐS ›
                  </Link>
                ) : l.project_id ? (
                  <Link href={`/projects/${l.project_id}`} className="text-xs font-semibold text-blue-600 hover:underline">
                    🏙 {projMap.get(l.project_id) || "Dự án"} ›
                  </Link>
                ) : (
                  <span className="text-xs text-slate-400">(liên hệ chung)</span>
                )}
                <span className="ml-auto text-xs text-slate-400">
                  {new Date(l.created_at).toLocaleString("vi-VN")}
                </span>
              </div>
            ))
          ) : (
            <p className="p-8 text-center text-sm text-slate-400">Chưa có liên hệ nào.</p>
          )}
        </div>
      </AdminShell>
    );
  }

  // ═════════════════════════════════════════════════════════════════════════════
  // TAB 5: MÔI GIỚI & CHỦ NHÀ (AGENTS)
  // ═════════════════════════════════════════════════════════════════════════════
  if (tab === "agents") {
    const { data: profs } = await admin
      .from("profiles")
      .select("id, full_name, agency_name, phone, is_verified, years_experience")
      .or("role.eq.agent,role.eq.admin,agency_name.not.is.null")
      .limit(100);

    return (
      <AdminShell>
        <div className="mb-4">
          <h1 className="text-xl font-bold text-slate-800">Xác Minh Môi Giới & Chủ Nhà</h1>
          <p className="text-xs text-slate-500">Hồ sơ người bán chuyên nghiệp trên sàn</p>
        </div>

        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          {(profs ?? []).length ? (
            (profs ?? []).map((p2) => (
              <div
                key={p2.id}
                className="flex flex-wrap items-center gap-x-3 gap-y-1 border-b border-slate-100 px-4 py-3 text-sm last:border-0"
              >
                {p2.is_verified && (
                  <span className="rounded bg-emerald-100 px-1.5 py-0.5 text-[10px] font-bold text-emerald-800">
                    ✓ Đã xác minh
                  </span>
                )}
                <span className="font-semibold text-slate-800">{p2.full_name || "(chưa đặt tên)"}</span>
                {p2.agency_name && <span className="text-xs text-slate-500">{p2.agency_name}</span>}
                {p2.phone && (
                  <a href={`tel:${p2.phone}`} className="font-mono text-xs text-slate-600">
                    📞 {p2.phone}
                  </a>
                )}
                <form action={setVerified} className="ml-auto">
                  <input type="hidden" name="id" value={p2.id} />
                  <input type="hidden" name="verified" value={String(!p2.is_verified)} />
                  <button className="rounded-lg bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-200">
                    {p2.is_verified ? "Bỏ xác minh" : "✓ Xác minh"}
                  </button>
                </form>
              </div>
            ))
          ) : (
            <p className="p-8 text-center text-sm text-slate-400">Chưa có hồ sơ người bán nào.</p>
          )}
        </div>
      </AdminShell>
    );
  }

  // ═════════════════════════════════════════════════════════════════════════════
  // TAB 6: BÁO CÁO TIN XẤU (REPORTS)
  // ═════════════════════════════════════════════════════════════════════════════
  if (tab === "reports") {
    type ReportRow = {
      id: string;
      listing_id: string;
      reason: string;
      detail: string | null;
      status: string;
      created_at: string;
      listings: { title: string; status: string; source_site: string | null; source: string } | null;
    };
    const { data } = await admin
      .from("listing_reports")
      .select("id, listing_id, reason, detail, status, created_at, listings(title, status, source_site, source)")
      .order("created_at", { ascending: false })
      .limit(200);
    const reports = (data ?? []) as unknown as ReportRow[];

    return (
      <AdminShell>
        <div className="mb-4">
          <h1 className="text-xl font-bold text-slate-800">Báo Cáo Tin Vi Phạm</h1>
          <p className="text-xs text-slate-500">Người dùng báo cáo tin ảo, trùng lặp, sai giá hoặc đã bán</p>
        </div>

        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          {reports.length ? (
            reports.map((r) => (
              <div
                key={r.id}
                className={`flex flex-wrap items-center gap-x-3 gap-y-1.5 border-b border-slate-100 px-4 py-3 text-sm last:border-0 ${
                  r.status !== "new" ? "opacity-60" : ""
                }`}
              >
                <span
                  className={`rounded px-1.5 py-0.5 text-[10px] font-bold ${
                    r.status === "new" ? "bg-red-100 text-red-700" : "bg-slate-100 text-slate-500"
                  }`}
                >
                  {r.status === "new" ? "mới" : r.status === "resolved" ? "đã xử lý" : "bỏ qua"}
                </span>
                <span className="font-semibold text-slate-800">
                  {REPORT_REASONS[r.reason] || r.reason}
                </span>
                <Link
                  href={`/listings/${r.listing_id}`}
                  className="max-w-[340px] truncate font-medium hover:text-emerald-600"
                >
                  {r.listings?.title || r.listing_id}
                </Link>
                {r.detail && <span className="basis-full text-xs text-slate-500">“{r.detail}”</span>}
                <span className="text-xs text-slate-400">
                  {new Date(r.created_at).toLocaleString("vi-VN")}
                </span>
                {r.status === "new" && (
                  <span className="ml-auto flex gap-1.5">
                    {r.listings?.status === "published" && (
                      <form action={resolveReport}>
                        <input type="hidden" name="id" value={r.id} />
                        <input type="hidden" name="status" value="resolved" />
                        <input type="hidden" name="hide_listing" value={r.listing_id} />
                        <button className="rounded-lg bg-red-50 px-2.5 py-1 text-xs font-semibold text-red-600 hover:bg-red-100">
                          Ẩn tin
                        </button>
                      </form>
                    )}
                    <form action={resolveReport}>
                      <input type="hidden" name="id" value={r.id} />
                      <input type="hidden" name="status" value="resolved" />
                      <button className="rounded-lg bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700 hover:bg-emerald-100">
                        ✓ Đã xử lý
                      </button>
                    </form>
                    <form action={resolveReport}>
                      <input type="hidden" name="id" value={r.id} />
                      <input type="hidden" name="status" value="ignored" />
                      <button className="rounded-lg bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-600 hover:bg-slate-200">
                        Bỏ qua
                      </button>
                    </form>
                  </span>
                )}
              </div>
            ))
          ) : (
            <p className="p-8 text-center text-sm text-slate-400">Chưa có báo cáo nào.</p>
          )}
        </div>
      </AdminShell>
    );
  }

  // ═════════════════════════════════════════════════════════════════════════════
  // TAB 7: BÁO CÁO THỐNG KÊ (STATS)
  // ═════════════════════════════════════════════════════════════════════════════
  const [totalListings, totalPrices, totalBuyers, totalDeals, botErrorsRes] = await Promise.all([
    admin.from("listings").select("id", { count: "exact", head: true }),
    admin.from("price_history").select("id", { count: "exact", head: true }),
    admin.from("buyers").select("id", { count: "exact", head: true }),
    admin.from("deals").select("id", { count: "exact", head: true }),
    admin.from("bot_errors").select("id, at, source, detail").order("at", { ascending: false }).limit(10),
  ]);

  const botErrors = botErrorsRes.data ?? [];

  return (
    <AdminShell>
      <div className="mb-6">
        <h1 className="text-xl font-bold text-slate-800">Thống Kê Vận Hành & Bot Health</h1>
        <p className="text-xs text-slate-500">Chỉ số quy mô dữ liệu và nhật ký hoạt động hệ thống</p>
      </div>

      <div className="mb-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="text-xs font-semibold text-slate-500">Tổng Số BĐS Sàn</div>
          <div className="mt-1 text-3xl font-black text-slate-800">{totalListings.count ?? 0}</div>
          <div className="mt-1 text-[11px] text-emerald-600 font-semibold">✓ Đã dọn tin rác quá 21 ngày</div>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="text-xs font-semibold text-slate-500">Điểm Lịch Sử Giá</div>
          <div className="mt-1 text-3xl font-black text-blue-600">{totalPrices.count ?? 0}</div>
          <div className="mt-1 text-[11px] text-slate-500">Phục vụ biểu đồ giá 180 ngày</div>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="text-xs font-semibold text-slate-500">Khách Hàng CRM</div>
          <div className="mt-1 text-3xl font-black text-purple-600">{totalBuyers.count ?? 0}</div>
          <div className="mt-1 text-[11px] text-slate-500">Hồ sơ nhu cầu & Zalo ID</div>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="text-xs font-semibold text-slate-500">Thương Vụ (Deals)</div>
          <div className="mt-1 text-3xl font-black text-emerald-600">{totalDeals.count ?? 0}</div>
          <div className="mt-1 text-[11px] text-slate-500">Đã vào phễu chăm sóc</div>
        </div>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="mb-3 text-base font-bold text-slate-800">Nhật Ký Lỗi Bot (Bot Errors Log)</h2>
        {botErrors.length ? (
          <div className="divide-y divide-slate-100 font-mono text-xs">
            {botErrors.map((err) => (
              <div key={err.id} className="py-2.5">
                <div className="flex items-center justify-between text-slate-400 text-[11px]">
                  <span>Nguồn: <strong>{err.source}</strong></span>
                  <span>{new Date(err.at).toLocaleString("vi-VN")}</span>
                </div>
                <div className="mt-1 text-red-600">{err.detail || "Unknown error"}</div>
              </div>
            ))}
          </div>
        ) : (
          <p className="py-6 text-center text-xs text-slate-400">
            Hệ thống bot hoạt động ổn định, 0 lỗi ghi nhận trong 24 giờ qua.
          </p>
        )}
      </div>
    </AdminShell>
  );
}
