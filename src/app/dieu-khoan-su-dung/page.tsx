import type { Metadata } from "next";
import Link from "next/link";
import { FileText, CheckCircle2, AlertTriangle, ShieldAlert } from "lucide-react";

export const metadata: Metadata = {
  title: "Điều khoản sử dụng dịch vụ | NhaDat Radar",
  description: "Quy định và điều khoản sử dụng dịch vụ trên nền tảng tìm kiếm, so sánh bất động sản NhaDat Radar.",
  alternates: { canonical: "/dieu-khoan-su-dung" },
};

export default function DieuKhoanSuDungPage() {
  return (
    <article className="max-w-4xl mx-auto py-8 text-[var(--ink)]">
      <header className="mb-10 pb-6 border-b border-[var(--line)]">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-50 dark:bg-blue-950/50 text-blue-700 dark:text-blue-300 text-xs font-semibold mb-3">
          <FileText className="w-4 h-4" />
          Quy chế hoạt động &amp; Điều khoản dịch vụ
        </div>
        <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight">Điều Khoản Sử Dụng</h1>
        <p className="mt-2 text-sm text-[var(--ink-soft)]">
          Cập nhật lần cuối: Ngày 14 tháng 10 năm 2026 · Áp dụng cho người dùng và đối tác của NhaDat Radar
        </p>
      </header>

      <div className="space-y-8 text-sm leading-relaxed text-[var(--ink-soft)]">
        <section>
          <h2 className="text-lg font-bold text-[var(--ink)] mb-3 flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-brand" />
            1. Chấp thuận các điều khoản
          </h2>
          <p>
            Khi truy cập và sử dụng website <strong>NhaDat Radar</strong> (nhadatradar.com), bạn đồng ý tuân thủ toàn bộ các điều khoản và điều kiện được nêu tại đây.
            Nếu bạn không đồng ý với bất kỳ phần nào của các điều khoản này, vui lòng ngừng sử dụng dịch vụ.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-bold text-[var(--ink)] mb-3">2. Dịch vụ của NhaDat Radar</h2>
          <p>
            NhaDat Radar cung cấp nền tảng công nghệ tìm kiếm thông minh, hỗ trợ người dùng:
          </p>
          <ul className="list-disc pl-5 space-y-1.5 mt-2">
            <li>Tra cứu thông tin bất động sản bán và cho thuê được tổng hợp và chuẩn hóa bằng công nghệ AI.</li>
            <li>Tham khảo mức giá thị trường, giá trung vị theo khu vực, biến động lịch sử giá và cảnh báo mức giá lệch.</li>
            <li>Sử dụng các tiện ích tính toán tài chính: máy tính lãi vay mua nhà, so sánh chi phí thuê hay mua.</li>
            <li>Kết nối trực tiếp giữa người mua/thuê nhà và các nhà môi giới/chủ tài sản.</li>
          </ul>
        </section>

        <section className="p-5 rounded-2xl bg-amber-50/50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/40">
          <h2 className="text-base font-bold text-amber-900 dark:text-amber-300 mb-3 flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400" />
            3. Miễn trừ trách nhiệm về thông tin bất động sản
          </h2>
          <div className="space-y-2 text-amber-950/80 dark:text-amber-200/80 text-xs sm:text-sm">
            <p>
              Các thông tin nhà đất, giá bán, pháp lý, tình trạng quy hoạch và hình ảnh được tổng hợp tự động từ nhiều nguồn công khai cũng như do người dùng/môi giới đăng tải.
            </p>
            <p>
              NhaDat Radar luôn nỗ lực ứng dụng thuật toán xác thực để lọc bỏ tin giả, tin trùng lặp; tuy nhiên thông tin trên hệ thống <strong>chỉ mang tính chất tham khảo</strong>.
              Trước khi thực hiện bất kỳ giao dịch đặt cọc hoặc chuyển nhượng tài sản nào, người mua/thuê phải tự mình kiểm tra trực tiếp giấy tờ pháp lý (sổ đỏ/sổ hồng), quy hoạch tại cơ quan nhà nước có thẩm quyền và hiện trạng căn nhà.
            </p>
          </div>
        </section>

        <section>
          <h2 className="text-lg font-bold text-[var(--ink)] mb-3 flex items-center gap-2">
            <ShieldAlert className="w-5 h-5 text-rose-600 dark:text-rose-400" />
            4. Trách nhiệm và hành vi bị nghiêm cấm
          </h2>
          <ul className="list-disc pl-5 space-y-1.5">
            <li>Đăng tải thông tin bất động sản sai sự thật, giá ảo, ảnh minh họa lừa dối người tiêu dùng.</li>
            <li>Sử dụng các công cụ can thiệp phá hoại hệ thống, tấn công từ chối dịch vụ (DDoS) hoặc tự ý khai thác lỗ hổng bảo mật.</li>
            <li>Lạm dụng, quấy rối người dùng khác hoặc nhân viên hỗ trợ của hệ thống.</li>
            <li>Đăng tải nội dung đồi trụy, vi phạm thuần phong mỹ tục hoặc trái pháp luật nước CHXHCN Việt Nam.</li>
          </ul>
        </section>

        <section>
          <h2 className="text-lg font-bold text-[var(--ink)] mb-3">5. Quyền sở hữu trí tuệ</h2>
          <p>
            Giao diện, mã nguồn, logo thương hiệu &quot;NhaDat Radar&quot;, thuật toán định giá AI và cơ sở dữ liệu phân tích thị trường thuộc sở hữu của NhaDat Radar.
            Mọi hành vi sao chép toàn bộ hoặc một phần giao diện, cơ sở dữ liệu nhằm mục đích thương mại khi chưa có sự đồng ý bằng văn bản đều là vi phạm pháp luật.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-bold text-[var(--ink)] mb-3">6. Thay đổi điều khoản</h2>
          <p>
            Chúng tôi có thể cập nhật các Điều khoản sử dụng này bất cứ lúc nào để phù hợp với quy định pháp luật và tính năng sản phẩm mới.
            Các thay đổi sẽ có hiệu lực ngay khi được công bố trên website.
          </p>
        </section>

        <section className="pt-6 border-t border-[var(--line)]">
          <p className="text-xs text-[var(--ink-faint)]">
            Nếu bạn có bất kỳ câu hỏi nào về Điều khoản sử dụng, vui lòng liên hệ Ban quản trị tại trang{" "}
            <Link href="/lien-he" className="text-brand font-semibold underline">
              Liên hệ hỗ trợ
            </Link>.
          </p>
        </section>
      </div>
    </article>
  );
}
