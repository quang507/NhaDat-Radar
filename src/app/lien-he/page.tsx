import type { Metadata } from "next";
import { Phone, Mail, Clock, MapPin, Send, MessageSquare } from "lucide-react";

export const metadata: Metadata = {
  title: "Liên hệ hỗ trợ & Hợp tác | NhaDat Radar",
  description: "Thông tin liên hệ, hotline tư vấn pháp lý, thẩm định giá và hợp tác quảng cáo cùng nền tảng NhaDat Radar.",
  alternates: { canonical: "/lien-he" },
};

export default function LienHePage() {
  return (
    <article className="max-w-4xl mx-auto py-8 text-[var(--ink)]">
      <header className="mb-10 pb-6 border-b border-[var(--line)]">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-brand/10 text-brand text-xs font-semibold mb-3">
          <MessageSquare className="w-4 h-4" />
          Hỗ trợ 24/7
        </div>
        <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight">Liên Hệ Ban Quản Trị</h1>
        <p className="mt-2 text-sm text-[var(--ink-soft)]">
          Chúng tôi luôn sẵn sàng lắng nghe mọi góp ý, câu hỏi hỗ trợ kỹ thuật và đề xuất hợp tác từ bạn.
        </p>
      </header>

      <div className="grid md:grid-cols-2 gap-8">
        <div className="space-y-6 text-sm text-[var(--ink-soft)]">
          <div className="p-6 rounded-2xl bg-[var(--surface)] border border-[var(--line)] space-y-4">
            <h2 className="text-base font-bold text-[var(--ink)]">Thông tin liên lạc trực tiếp</h2>
            
            <div className="flex items-start gap-3">
              <div className="w-9 h-9 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 grid place-items-center shrink-0">
                <Phone className="w-4 h-4" />
              </div>
              <div>
                <span className="text-xs text-[var(--ink-faint)] block">Hotline tư vấn (8:00 - 21:00)</span>
                <a href="tel:0346689460" className="text-base font-bold text-brand hover:underline">
                  0346 689 460
                </a>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="w-9 h-9 rounded-lg bg-blue-50 dark:bg-blue-950/40 text-blue-600 grid place-items-center shrink-0">
                <Mail className="w-4 h-4" />
              </div>
              <div>
                <span className="text-xs text-[var(--ink-faint)] block">Email hỗ trợ &amp; Hợp tác</span>
                <a href="mailto:contact@nhadatradar.com" className="font-semibold text-[var(--ink)] hover:text-brand">
                  contact@nhadatradar.com
                </a>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="w-9 h-9 rounded-lg bg-purple-50 dark:bg-purple-950/40 text-purple-600 grid place-items-center shrink-0">
                <Clock className="w-4 h-4" />
              </div>
              <div>
                <span className="text-xs text-[var(--ink-faint)] block">Thời gian làm việc</span>
                <span className="font-medium text-[var(--ink)]">Thứ 2 - Chủ Nhật (Kể cả ngày lễ)</span>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="w-9 h-9 rounded-lg bg-amber-50 dark:bg-amber-950/40 text-amber-600 grid place-items-center shrink-0">
                <MapPin className="w-4 h-4" />
              </div>
              <div>
                <span className="text-xs text-[var(--ink-faint)] block">Trụ sở hoạt động</span>
                <span className="font-medium text-[var(--ink)]">Việt Nam</span>
              </div>
            </div>
          </div>

          <div className="p-4 rounded-xl bg-brand/5 border border-brand/20 text-xs leading-relaxed">
            💡 <strong>Mẹo nhanh:</strong> Nếu bạn cần hỗ trợ tìm kiếm nhà đất theo tài chính, bạn cũng có thể bấm vào biểu tượng <strong>Trợ lý AI Radar</strong> ở góc dưới bên phải màn hình để nhận gợi ý tức thì.
          </div>
        </div>

        {/* Form liên hệ nhanh */}
        <div className="p-6 rounded-2xl bg-[var(--surface)] border border-[var(--line)]">
          <h2 className="text-base font-bold text-[var(--ink)] mb-1">Gửi tin nhắn trực tiếp</h2>
          <p className="text-xs text-[var(--ink-soft)] mb-5">Đội ngũ hỗ trợ sẽ phản hồi lại bạn trong vòng 24 giờ làm việc.</p>

          <form
            onSubmit={undefined}
            action="mailto:contact@nhadatradar.com"
            method="GET"
            className="space-y-4 text-xs"
          >
            <div>
              <label className="block font-semibold text-[var(--ink)] mb-1">Họ và tên của bạn</label>
              <input
                type="text"
                placeholder="Nguyễn Văn A"
                className="w-full px-3 py-2.5 rounded-xl border border-[var(--line)] bg-[var(--bg)] text-sm focus:outline-none focus:border-brand"
                required
              />
            </div>

            <div>
              <label className="block font-semibold text-[var(--ink)] mb-1">Số điện thoại hoặc Email</label>
              <input
                type="text"
                placeholder="0912 345 678 hoặc email@domain.com"
                className="w-full px-3 py-2.5 rounded-xl border border-[var(--line)] bg-[var(--bg)] text-sm focus:outline-none focus:border-brand"
                required
              />
            </div>

            <div>
              <label className="block font-semibold text-[var(--ink)] mb-1">Nội dung yêu cầu</label>
              <textarea
                rows={4}
                placeholder="Nội dung cần hỗ trợ, tư vấn BĐS hoặc thông tin hợp tác..."
                className="w-full px-3 py-2.5 rounded-xl border border-[var(--line)] bg-[var(--bg)] text-sm focus:outline-none focus:border-brand resize-none"
                required
              ></textarea>
            </div>

            <button
              type="submit"
              className="w-full py-2.5 rounded-xl bg-brand text-white font-semibold flex items-center justify-center gap-2 hover:opacity-90 transition-opacity"
            >
              <Send className="w-4 h-4" />
              Gửi yêu cầu hỗ trợ
            </button>
          </form>
        </div>
      </div>
    </article>
  );
}
