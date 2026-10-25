export const revalidate = 3600; // trang tĩnh, cache CDN như trang chủ (số liệu lấy từ cây khu vực đã cache)

import type { Metadata } from "next";
import { getAreas } from "@/lib/geo";
import { HOTLINE, HOTLINE_ZALO } from "@/lib/hotline";
import FormLapPhong from "./FormLapPhong";
import {
  Camera, CheckCircle2, ChevronDown, ClipboardList, EyeOff, Handshake, MapPin, MessageCircle,
  Phone, Search, ShieldCheck, Users,
} from "lucide-react";

// TRANG LẤP PHÒNG CHO CHỦ TRỌ (25/10). Học bố cục dịch vụ lấp phòng phổ biến (nỗi đau -> số liệu ->
// quy trình -> gói -> form -> FAQ) nhưng mọi câu chữ & con số là của Radar: số liệu đọc từ DB thật,
// cam kết DUY NHẤT là "chỉ thu phí khi khách ký hợp đồng" (không hứa số ngày / hoàn phí - quyết định 25/10).
// Phòng chủ trọ gửi sẽ vào rổ hàng (source ro_hang): địa chỉ thật & SĐT chủ chỉ admin thấy.
export const metadata: Metadata = {
  title: "Dịch vụ lấp phòng trọ cho chủ nhà - chỉ thu phí khi có khách ký hợp đồng | NhaDat Radar",
  description: "Chủ trọ, căn hộ dịch vụ, KTX còn phòng trống: Radar chụp ảnh, đăng tin, dẫn khách đã lọc tới xem. Miễn phí khảo sát, chỉ thu phí khi khách ký hợp đồng thuê.",
  alternates: { canonical: "/lap-phong" },
};

const BUOC = [
  { icon: ClipboardList, t: "Đăng ký", d: "Để lại SĐT, khu vực và số phòng trống. Mất khoảng 30 giây." },
  { icon: Phone, t: "Radar gọi khảo sát", d: "Hỏi kỹ phòng, giá, giờ giấc; báo rõ mức phí trước khi làm." },
  { icon: Camera, t: "Lên tin trong 24 giờ", d: "Chụp ảnh thật, gắn mã phòng, đăng lên Nhadatradar, Zalo OA và nhóm tìm phòng." },
  { icon: Handshake, t: "Dẫn khách tới xem", d: "Khách đã hỏi kỹ nhu cầu. Bạn chỉ việc gặp và ký hợp đồng." },
];

const GOI: { ten: string; gia: string; danhCho: string; noiBat?: boolean; quyenLoi: string[] }[] = [
  { ten: "Cơ bản", gia: "Miễn phí đăng", danhCho: "Chủ nhà có vài phòng trống",
    quyenLoi: ["Đăng phòng lên Nhadatradar kèm mã phòng", "Nhãn \"Đã xác minh\" sau khảo sát", "Khách liên hệ qua hotline & Zalo Radar"] },
  { ten: "Pro", gia: "Báo phí theo chiến dịch", danhCho: "Muốn lấp nhanh, nhiều phòng", noiBat: true,
    quyenLoi: ["Mọi quyền lợi gói Cơ bản", "Chụp ảnh & quay video phòng tận nơi", "Đẩy tin Zalo OA và các nhóm tìm phòng", "Ưu tiên hiển thị trong khu vực", "Báo lượt xem & lượt liên hệ hằng tuần"] },
  { ten: "Premium", gia: "Báo phí theo chiến dịch", danhCho: "Chuỗi nhà trọ, KTX, căn hộ dịch vụ",
    quyenLoi: ["Mọi quyền lợi gói Pro", "Người phụ trách riêng cho cơ sở", "Quảng cáo riêng cho thương hiệu nhà", "Đồng bộ phòng trống định kỳ"] },
];

const KENH = [
  { icon: Search, t: "Nhadatradar & Google", d: "Trang khu vực theo quận/phường lên Google - đúng lúc khách đang tìm phòng." },
  { icon: MessageCircle, t: "Zalo OA Radar", d: "Khách nhắn mã phòng, Radar tư vấn và hẹn giờ xem ngay." },
  { icon: Users, t: "Nhóm tìm phòng", d: "Tin được đẩy vào các nhóm Facebook/Zalo tìm trọ theo khu vực." },
  { icon: EyeOff, t: "Kín thông tin chủ nhà", d: "Địa chỉ chính xác & SĐT của bạn không hiện công khai - chỉ gửi cho khách đã hẹn xem." },
];

const FAQ = [
  ["Phí tính thế nào?", "Radar chỉ thu phí khi khách do Radar giới thiệu ký hợp đồng thuê. Mức phí báo rõ trước khi triển khai, tuỳ gói và loại phòng. Gói Cơ bản không thu phí đăng."],
  ["Có phải trả trước khoản nào không?", "Không. Khảo sát, chụp ảnh và đăng tin đều không thu trước."],
  ["Bao lâu thì có khách?", "Tuỳ vị trí, giá và thời điểm trong tháng. Radar báo lượt xem, lượt liên hệ để bạn điều chỉnh giá hoặc mô tả nếu cần - không hứa con số ảo."],
  ["Địa chỉ và số điện thoại của tôi có bị lộ không?", "Không. Trên web chỉ hiện tên đường và vị trí gần đúng; số nhà và SĐT chủ chỉ gửi cho khách đã chốt lịch xem."],
  ["Radar đang nhận khu vực nào?", "Hiện tập trung TP.HCM. Khu vực khác cứ để lại thông tin, Radar sẽ báo khi mở."],
  ["Phòng đã có người thuê thì sao?", "Nhắn Zalo cho Radar, tin được gỡ ngay để khách không gọi nhầm."],
];

export default async function LapPhong() {
  const areas = await getAreas().catch(() => null);
  const hcm = areas?.counts["Hồ Chí Minh"];
  const quanCoPhong = hcm ? Object.values(hcm.districts).filter((d) => d.cho_thue > 0).length : 0;
  const so = (n: number) => n.toLocaleString("vi-VN");
  const SO_LIEU = [
    hcm?.cho_thue ? { n: so(hcm.cho_thue), t: "tin cho thuê đang hiển thị tại TP.HCM" } : null,
    quanCoPhong ? { n: String(quanCoPhong), t: "quận/huyện TP.HCM có khách tìm phòng trên Radar" } : null,
    areas?.total ? { n: so(areas.total), t: "tin nhà đất trên toàn hệ thống" } : null,
    { n: "0đ", t: "trả trước - chỉ thu phí khi khách ký hợp đồng" },
  ].filter(Boolean) as { n: string; t: string }[];

  return (
    <div className="flex flex-col gap-12 sm:gap-16">
      {/* ===== HERO ===== */}
      <section className="grid lg:grid-cols-[1fr_420px] gap-8 items-start pt-2">
        <div className="flex flex-col gap-4">
          <span className="overline text-brand">Dành cho chủ trọ · căn hộ dịch vụ · KTX</span>
          <h1 className="display-2 text-[var(--ink)] text-balance">Phòng trống để Radar lo, bạn chỉ việc ký hợp đồng</h1>
          <p className="body-lg text-[var(--ink-soft)] max-w-xl">
            Radar chụp ảnh thật, đăng phòng lên Nhadatradar, Zalo OA và các nhóm tìm phòng, rồi dẫn khách đã hỏi kỹ nhu cầu tới xem.
          </p>
          <ul className="flex flex-col gap-2 text-sm text-[var(--ink)]">
            {["Khảo sát & chụp ảnh miễn phí", "Chỉ thu phí khi khách ký hợp đồng thuê", "Không ràng buộc thời hạn, dừng lúc nào cũng được"].map((x) => (
              <li key={x} className="flex items-center gap-2"><CheckCircle2 className="w-5 h-5 text-brand shrink-0" />{x}</li>
            ))}
          </ul>
          <div className="hidden lg:flex gap-3 mt-2">
            <a href="#dang-ky" className="btn btn-primary min-h-12 px-6 font-bold">Đăng ký lấp phòng</a>
            <a href={`tel:${HOTLINE}`} className="btn min-h-12 px-5 font-bold"><Phone className="w-4 h-4" /> {HOTLINE.replace(/(\d{4})(\d{3})(\d{3})/, "$1 $2 $3")}</a>
          </div>
        </div>
        {/* số liệu thật - lưới 2x2 */}
        <div className="grid grid-cols-2 gap-3">
          {SO_LIEU.map((s) => (
            <div key={s.t} className="card p-4 flex flex-col gap-1">
              <div className="text-2xl sm:text-3xl font-extrabold text-brand tracking-tight">{s.n}</div>
              <div className="text-xs text-[var(--ink-soft)] leading-snug">{s.t}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ===== QUY TRÌNH ===== */}
      <section className="flex flex-col gap-5">
        <h2 className="heading-2 text-[var(--ink)]">Quy trình 4 bước, bạn không phải làm gì phức tạp</h2>
        <ol className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {BUOC.map(({ icon: Icon, t, d }, i) => (
            <li key={t} className="card p-5 flex flex-col gap-2">
              <div className="flex items-center gap-2">
                <span className="w-8 h-8 rounded grid place-items-center bg-brand/10 text-brand font-bold text-sm">{i + 1}</span>
                <Icon className="w-5 h-5 text-[var(--ink-faint)]" />
              </div>
              <div className="font-bold text-[var(--ink)]">{t}</div>
              <p className="text-sm text-[var(--ink-soft)]">{d}</p>
            </li>
          ))}
        </ol>
      </section>

      {/* ===== GÓI ===== */}
      <section className="flex flex-col gap-5">
        <div>
          <h2 className="heading-2 text-[var(--ink)]">Gói dịch vụ cho mọi quy mô</h2>
          <p className="text-sm text-[var(--ink-soft)] mt-1">Mọi gói đều <b className="text-[var(--ink)]">chỉ thu phí khi khách ký hợp đồng thuê</b>. Mức phí báo trước khi triển khai.</p>
        </div>
        <div className="grid lg:grid-cols-3 gap-4 items-stretch">
          {GOI.map((g) => (
            <div key={g.ten} className={`card p-5 flex flex-col gap-4 ${g.noiBat ? "!border-brand ring-1 ring-brand" : ""}`}>
              <div className="flex items-center justify-between gap-2">
                <div className="heading-3 text-[var(--ink)]">{g.ten}</div>
                {g.noiBat && <span className="overline px-2 py-1 rounded-sm bg-brand text-white">Nhiều chủ nhà chọn</span>}
              </div>
              <div>
                <div className="font-extrabold text-lg text-brand">{g.gia}</div>
                <div className="text-xs text-[var(--ink-soft)]">{g.danhCho}</div>
              </div>
              <ul className="flex flex-col gap-2 text-sm text-[var(--ink)] flex-1">
                {g.quyenLoi.map((q) => <li key={q} className="flex gap-2"><CheckCircle2 className="w-4 h-4 text-brand shrink-0 mt-0.5" />{q}</li>)}
              </ul>
              <a href="#dang-ky" className={`btn min-h-11 font-bold ${g.noiBat ? "btn-primary" : ""}`}>Đăng ký gói {g.ten}</a>
            </div>
          ))}
        </div>
      </section>

      {/* ===== KÊNH + CAM KẾT ===== */}
      <section className="flex flex-col gap-5">
        <h2 className="heading-2 text-[var(--ink)]">Khách tìm phòng thấy phòng của bạn ở đâu</h2>
        <div className="grid sm:grid-cols-2 gap-3">
          {KENH.map(({ icon: Icon, t, d }) => (
            <div key={t} className="card p-5 flex gap-4">
              <span className="w-10 h-10 shrink-0 rounded grid place-items-center bg-brand/10 text-brand"><Icon className="w-5 h-5" /></span>
              <div>
                <div className="font-bold text-[var(--ink)]">{t}</div>
                <p className="text-sm text-[var(--ink-soft)] mt-0.5">{d}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ===== FORM ===== */}
      <section id="dang-ky" className="grid lg:grid-cols-[1fr_1.4fr] gap-6 items-start scroll-mt-24">
        <div className="flex flex-col gap-3">
          <h2 className="heading-2 text-[var(--ink)]">Đăng ký lấp phòng trống</h2>
          <p className="text-[var(--ink-soft)]">Radar gọi lại trong giờ làm việc. Miễn phí, không ràng buộc.</p>
          <div className="card p-4 flex items-center gap-3">
            <ShieldCheck className="w-6 h-6 text-brand shrink-0" />
            <p className="text-sm text-[var(--ink-soft)]">Thông tin của bạn chỉ dùng để Radar liên hệ, không hiện công khai.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <a href={`tel:${HOTLINE}`} className="btn min-h-11 font-bold"><Phone className="w-4 h-4" /> Gọi {HOTLINE}</a>
            <a href={HOTLINE_ZALO} target="_blank" rel="noopener noreferrer" className="btn min-h-11 font-bold !border-[#0068ff] !text-[#0068ff]"><MessageCircle className="w-4 h-4" /> Nhắn Zalo</a>
          </div>
        </div>
        <div className="card p-5 sm:p-6"><FormLapPhong /></div>
      </section>

      {/* ===== FAQ ===== */}
      <section className="flex flex-col gap-4 max-w-3xl">
        <h2 className="heading-2 text-[var(--ink)]">Câu hỏi thường gặp</h2>
        <div className="flex flex-col divide-y divide-[var(--line)] card">
          {FAQ.map(([q, a]) => (
            <details key={q} className="group px-5">
              <summary className="flex items-center justify-between gap-3 min-h-14 cursor-pointer list-none font-semibold text-[var(--ink)] [&::-webkit-details-marker]:hidden">
                {q}
                <ChevronDown className="w-5 h-5 shrink-0 text-[var(--ink-faint)] transition-transform duration-200 group-open:rotate-180 motion-reduce:transition-none" />
              </summary>
              <p className="pb-4 text-sm text-[var(--ink-soft)]">{a}</p>
            </details>
          ))}
        </div>
        <p className="text-xs text-[var(--ink-faint)] flex items-center gap-1"><MapPin className="w-3.5 h-3.5" /> Hiện phục vụ TP.HCM.</p>
      </section>

      {/* Mobile: CTA dính đáy trong vùng ngón cái (thanh liên hệ chung được ẩn ở trang này - ChatWidget) */}
      <div className="lg:hidden h-16" aria-hidden />
      <nav aria-label="Đăng ký lấp phòng" className="lg:hidden fixed bottom-0 inset-x-0 z-40 grid grid-cols-[1fr_auto] gap-2 px-4 pt-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] border-t border-[var(--line)] bg-[var(--surface)]/95 backdrop-blur">
        <a href="#dang-ky" className="btn btn-primary min-h-12 font-bold">Đăng ký lấp phòng</a>
        <a href={HOTLINE_ZALO} target="_blank" rel="noopener noreferrer" aria-label="Nhắn Zalo Radar" className="btn min-h-12 font-bold !border-[#0068ff] !text-[#0068ff]">
          <MessageCircle className="w-4 h-4" /> Zalo
        </a>
      </nav>
    </div>
  );
}
