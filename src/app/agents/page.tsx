export const dynamic = "force-dynamic";

import Link from "next/link";
import { createClient } from "@/lib/supabase/server";

export const metadata = { title: "Người bán chuyên nghiệp - NhaDat Radar" };

type AgentRow = {
  id: string; full_name: string | null; avatar_url: string | null; bio: string | null;
  agency_name: string | null; specialties: string[] | null; languages: string[] | null;
  years_experience: number | null; is_verified: boolean;
};

const WHY = [
  ["✅", "Chuyên gia đã xác minh", "Người bán trải qua xác minh hồ sơ và duy trì tiêu chuẩn chuyên nghiệp cao"],
  ["📍", "Am hiểu thị trường địa phương", "Kiến thức sâu về thị trường, pháp lý và thông tin khu vực tại Việt Nam"],
  ["🤝", "Hỗ trợ toàn diện", "Đồng hành từ tìm kiếm bất động sản đến hoàn thành thủ tục pháp lý"],
  ["🏆", "Dịch vụ chất lượng", "Được ghi nhận về sự hài lòng của khách hàng và giao dịch thành công"],
  ["🔗", "Đối tác đáng tin cậy", "Quan hệ chặt chẽ với chủ đầu tư, ngân hàng và chuyên gia pháp lý"],
  ["⚡", "Phản hồi nhanh", "Cam kết giao tiếp nhanh chóng, xử lý giao dịch hiệu quả"],
] as const;

export default async function AgentsPage() {
  const supabase = await createClient();
  // Người bán = role agent/admin HOẶC đã điền hồ sơ người bán (tên công ty) ở /account
  const { data } = await supabase
    .from("profiles")
    .select("id,full_name,avatar_url,bio,agency_name,specialties,languages,years_experience,is_verified")
    .or("role.eq.agent,role.eq.admin,agency_name.not.is.null")
    .order("years_experience", { ascending: false })
    .limit(60);
  const agents = (data ?? []) as AgentRow[];

  // Đếm số tin published của từng agent
  const counts = new Map<string, number>();
  if (agents.length) {
    const { data: rows } = await supabase
      .from("listings").select("agent_id").eq("status", "published")
      .in("agent_id", agents.map((a) => a.id));
    for (const r of rows ?? []) if (r.agent_id) counts.set(r.agent_id, (counts.get(r.agent_id) || 0) + 1);
  }

  return (
    <div>
      {/* Hero */}
      <section className="text-center py-8">
        <h1 className="prata text-3xl mb-3">Kết nối với các chuyên gia bất động sản hàng đầu</h1>
        <p className="text-[var(--ink-soft)] max-w-2xl mx-auto mb-5">
          Tìm những người bán giàu kinh nghiệm có thể hướng dẫn bạn qua từng bước trong hành trình
          bất động sản của bạn tại Việt Nam.
        </p>
        <Link href="/account" className="btn btn-primary inline-block">Trở thành Người Bán</Link>
        <p className="text-xs text-[var(--ink-faint)] mt-2">Đăng nhập → vào Tài khoản → điền “Hồ sơ người bán” là xuất hiện tại đây.</p>
      </section>

      {/* Danh sách */}
      <section className="mt-4">
        <div className="text-sm font-semibold text-[var(--ink-soft)] mb-3">
          Tổng cộng {agents.length} Người Bán
        </div>
        {agents.length ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {agents.map((a) => {
              const name = a.full_name || "Người bán";
              const initials = name.split(" ").map((w) => w[0]).slice(-2).join("").toUpperCase();
              return (
                <div key={a.id} className="card rounded-2xl p-5 shadow-sm hover:shadow-lg transition flex flex-col items-center text-center">
                  <div className="w-20 h-20 rounded-full overflow-hidden bg-gradient-to-br from-brand to-brand-2 text-white grid place-items-center text-xl font-bold mb-3">
                    {a.avatar_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={a.avatar_url} alt={name} className="w-full h-full object-cover" />
                    ) : initials}
                  </div>
                  <div className="text-[0.65rem] font-bold uppercase tracking-wide text-brand mb-1">
                    {a.is_verified ? "✓ Đã xác minh" : "Người bán"}
                  </div>
                  <h3 className="font-bold leading-snug">{name}</h3>
                  {a.agency_name && <div className="text-xs text-[var(--ink-soft)] mt-0.5">{a.agency_name}</div>}
                  <div className="text-xs text-[var(--ink-soft)] mt-1">
                    {a.years_experience ? `${a.years_experience} năm kinh nghiệm` : "Việt Nam"}
                  </div>
                  {!!a.specialties?.length && (
                    <div className="flex flex-wrap justify-center gap-1 mt-2">
                      {a.specialties.slice(0, 3).map((s) => (
                        <span key={s} className="text-[0.65rem] font-semibold px-2 py-0.5 rounded-full bg-brand/10 text-brand border border-brand/30">{s}</span>
                      ))}
                    </div>
                  )}
                  {!!a.languages?.length && (
                    <div className="text-[0.7rem] text-[var(--ink-soft)] mt-1.5">🗣 {a.languages.slice(0, 4).join(" · ")}</div>
                  )}
                  <div className="text-xs text-[var(--ink-soft)] mt-2">{counts.get(a.id) || 0} bất động sản</div>
                  <Link href={`/search?q=${encodeURIComponent(name)}`} className="btn mt-3 w-full text-sm">Xem tin đăng</Link>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="card rounded-2xl p-10 text-center">
            <div className="text-4xl mb-3">🧑‍💼</div>
            <h3 className="font-bold text-lg mb-1">Chưa có người bán nào đăng ký</h3>
            <p className="text-[var(--ink-soft)] text-sm mb-4">
              Hãy là người bán đầu tiên trên NhaDat Radar — đăng ký miễn phí và đăng tin ngay hôm nay.
            </p>
            <Link href="/account" className="btn btn-primary inline-block">Đăng ký làm người bán</Link>
          </div>
        )}
      </section>

      {/* Vì sao */}
      <section className="mt-14">
        <h2 className="prata text-2xl text-center mb-2">Tại sao làm việc với các người bán của chúng tôi?</h2>
        <p className="text-[var(--ink-soft)] text-center max-w-2xl mx-auto mb-7 text-sm">
          Các chuyên gia bất động sản được lựa chọn cẩn thận về chuyên môn, kiến thức địa phương
          và cam kết dịch vụ xuất sắc.
        </p>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {WHY.map(([icon, t, d]) => (
            <div key={t} className="card rounded-2xl p-5">
              <div className="text-2xl mb-2">{icon}</div>
              <h3 className="font-bold mb-1">{t}</h3>
              <p className="text-sm text-[var(--ink-soft)]">{d}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
