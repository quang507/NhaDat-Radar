import type { Metadata } from "next";
import Link from "next/link";
import { Compass, Sparkles, CheckCircle2, ShieldCheck, TrendingUp, Users } from "lucide-react";

export const metadata: Metadata = {
  title: "Giới thiệu về NhaDat Radar | Nền tảng BĐS Minh Bạch",
  description: "Tìm hiểu về sứ mệnh, công nghệ AI và giá trị cốt lõi của NhaDat Radar - nền tảng tìm kiếm và so sánh bất động sản minh bạch hàng đầu.",
  alternates: { canonical: "/gioi-thieu" },
};

export default function GioiThieuPage() {
  return (
    <article className="max-w-4xl mx-auto py-8 text-[var(--ink)]">
      <header className="mb-10 text-center max-w-2xl mx-auto">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-brand/10 text-brand text-xs font-semibold mb-4">
          <Compass className="w-4 h-4" />
          Về chúng tôi
        </div>
        <h1 className="text-3xl sm:text-5xl font-extrabold tracking-tight">
          Minh bạch hoá thị trường bất động sản bằng AI
        </h1>
        <p className="mt-4 text-base text-[var(--ink-soft)] leading-relaxed">
          NhaDat Radar ra đời với mục tiêu giải quyết vấn đề nhức nhối nhất của người tìm nhà tại Việt Nam: 
          <strong> tin ảo, giá ảo và thiếu dữ liệu so sánh khách quan</strong>.
        </p>
      </header>

      <div className="space-y-12 text-sm leading-relaxed text-[var(--ink-soft)]">
        <section className="grid sm:grid-cols-3 gap-4">
          <div className="p-5 rounded-2xl bg-[var(--surface)] border border-[var(--line)] space-y-2">
            <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-950/40 text-blue-600 flex items-center justify-center font-bold">
              <Sparkles className="w-5 h-5" />
            </div>
            <h3 className="font-bold text-[var(--ink)] text-base">Tổng hợp đa nguồn</h3>
            <p className="text-xs">
              Thu thập và chuẩn hóa dữ liệu từ các sàn, hội nhóm môi giới và chủ nhà trực tiếp, loại bỏ tin đăng trùng lặp.
            </p>
          </div>

          <div className="p-5 rounded-2xl bg-[var(--surface)] border border-[var(--line)] space-y-2">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 flex items-center justify-center font-bold">
              <TrendingUp className="w-5 h-5" />
            </div>
            <h3 className="font-bold text-[var(--ink)] text-base">Radar đo giá lệch</h3>
            <p className="text-xs">
              So sánh mức giá từng căn với giá trung vị của phường/quận, cảnh báo ngay khi giá cao hơn hoặc rẻ bất thường.
            </p>
          </div>

          <div className="p-5 rounded-2xl bg-[var(--surface)] border border-[var(--line)] space-y-2">
            <div className="w-10 h-10 rounded-xl bg-purple-50 dark:bg-purple-950/40 text-purple-600 flex items-center justify-center font-bold">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <h3 className="font-bold text-[var(--ink)] text-base">Hỗ trợ pháp lý thật</h3>
            <p className="text-xs">
              Đội ngũ chuyên viên tư vấn hỗ trợ kiểm tra sổ, quy hoạch và hướng dẫn thủ tục sang tên hoàn toàn miễn phí.
            </p>
          </div>
        </section>

        <section className="p-6 sm:p-8 rounded-2xl bg-gradient-to-br from-[var(--surface)] to-brand/5 border border-[var(--line)] space-y-4">
          <h2 className="text-xl sm:text-2xl font-bold text-[var(--ink)]">Sứ mệnh của chúng tôi</h2>
          <p>
            Chúng tôi tin rằng việc mua nhà hay thuê một không gian sống là quyết định tài chính quan trọng bậc nhất của đời người.
            Người mua xứng đáng có được những công cụ minh bạch, khách quan nhất để không bị “hớ” giá và không mất thời gian vô ích vì những tin quảng cáo ảo.
          </p>
          <div className="grid sm:grid-cols-2 gap-3 pt-2 text-xs">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>Dữ liệu giá cập nhật hàng ngày theo thời gian thực</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>Thuật toán máy học tự động chấm điểm độ tin cậy</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>Công cụ tính lãi vay ngân hàng chính xác</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>Trợ lý AI hỗ trợ gợi ý căn nhà phù hợp 24/7</span>
            </div>
          </div>
        </section>

        <section className="text-center pt-6 space-y-4">
          <h2 className="text-xl font-bold text-[var(--ink)]">Bắt đầu trải nghiệm cùng NhaDat Radar</h2>
          <div className="flex flex-wrap items-center justify-center gap-3">
            <Link
              href="/search"
              className="px-6 py-2.5 rounded-xl bg-brand text-white font-semibold text-sm hover:opacity-90 transition-opacity"
            >
              Tìm kiếm nhà đất ngay
            </Link>
            <Link
              href="/lien-he"
              className="px-6 py-2.5 rounded-xl border border-[var(--line)] bg-[var(--surface)] font-semibold text-sm hover:border-brand transition-colors"
            >
              Liên hệ hợp tác
            </Link>
          </div>
        </section>
      </div>
    </article>
  );
}
