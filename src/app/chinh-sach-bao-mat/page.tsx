import type { Metadata } from "next";
import Link from "next/link";
import { ShieldCheck, Lock, Eye, Database, BellRing } from "lucide-react";

export const metadata: Metadata = {
  title: "Chính sách bảo mật thông tin | NhaDat Radar",
  description: "Chính sách bảo mật và quyền riêng tư của NhaDat Radar. Cam kết bảo vệ dữ liệu người dùng, minh bạch về việc sử dụng cookie và đối tác quảng cáo.",
  alternates: { canonical: "/chinh-sach-bao-mat" },
};

export default function ChinhSachBaoMatPage() {
  return (
    <article className="max-w-4xl mx-auto py-8 text-[var(--ink)]">
      <header className="mb-10 pb-6 border-b border-[var(--line)]">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 text-xs font-semibold mb-3">
          <ShieldCheck className="w-4 h-4" />
          Quyền riêng tư &amp; Bảo mật thông tin
        </div>
        <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight">Chính Sách Bảo Mật</h1>
        <p className="mt-2 text-sm text-[var(--ink-soft)]">
          Cập nhật lần cuối: Ngày 14 tháng 10 năm 2026 · Áp dụng cho toàn bộ người dùng truy cập nhadatradar.com
        </p>
      </header>

      <div className="space-y-8 text-sm leading-relaxed text-[var(--ink-soft)]">
        <section>
          <h2 className="text-lg font-bold text-[var(--ink)] mb-3 flex items-center gap-2">
            <Lock className="w-5 h-5 text-brand" />
            1. Giới thiệu chung
          </h2>
          <p>
            Chào mừng bạn đến với <strong>NhaDat Radar</strong> (sau đây gọi tắt là &quot;chúng tôi&quot; hoặc &quot;Hệ thống&quot;).
            Chúng tôi cam kết tôn trọng và bảo vệ tối đa quyền riêng tư cũng như dữ liệu cá nhân của người dùng khi truy cập,
            sử dụng các công cụ tìm kiếm, định giá AI, so sánh giá và dịch vụ trên website nhadatradar.com.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-bold text-[var(--ink)] mb-3 flex items-center gap-2">
            <Database className="w-5 h-5 text-brand" />
            2. Thông tin chúng tôi thu thập
          </h2>
          <p className="mb-2">Chúng tôi chỉ thu thập các thông tin cần thiết nhằm phục vụ trải nghiệm tìm kiếm nhà đất của bạn:</p>
          <ul className="list-disc pl-5 space-y-1.5">
            <li><strong>Thông tin tài khoản:</strong> Tên hiển thị, địa chỉ email, ảnh đại diện khi bạn chủ động đăng nhập qua Google Auth.</li>
            <li><strong>Thông tin liên hệ tự nguyện:</strong> Số điện thoại nếu bạn để lại yêu cầu tư vấn, hẹn lịch xem nhà hoặc liên hệ môi giới.</li>
            <li><strong>Dữ liệu duyệt web &amp; Thiết bị:</strong> Địa chỉ IP, loại trình duyệt, hệ điều hành, thời gian truy cập, lịch sử xem tin, bộ lọc tìm kiếm yêu thích nhằm tối ưu hóa gợi ý bất động sản.</li>
          </ul>
        </section>

        <section>
          <h2 className="text-lg font-bold text-[var(--ink)] mb-3 flex items-center gap-2">
            <Eye className="w-5 h-5 text-brand" />
            3. Mục đích sử dụng thông tin
          </h2>
          <ul className="list-disc pl-5 space-y-1.5">
            <li>Cung cấp và duy trì các tính năng: Lưu tin yêu thích, tạo thông báo giá khu vực, đề xuất nhà đất tương tự bằng AI.</li>
            <li>Kết nối người mua/thuê với môi giới hoặc chủ nhà uy tín theo đúng yêu cầu đã đăng ký.</li>
            <li>Phân tích thống kê ẩn danh nhằm cải thiện tốc độ, độ chính xác của biểu đồ giá và thuật toán lọc tin rác.</li>
            <li>Ngăn chặn các hành vi gian lận, phá hoại an ninh mạng hoặc vi phạm pháp luật.</li>
          </ul>
        </section>

        <section className="p-5 rounded-2xl bg-[var(--surface)] border border-[var(--line)]">
          <h2 className="text-base font-bold text-[var(--ink)] mb-3 flex items-center gap-2">
            <BellRing className="w-5 h-5 text-amber-600 dark:text-amber-400" />
            4. Cookie, Công nghệ theo dõi &amp; Quảng cáo Google (AdSense &amp; Analytics)
          </h2>
          <div className="space-y-3">
            <p>
              Website nhadatradar.com sử dụng <strong>Cookie</strong> và các công nghệ lưu trữ cục bộ để ghi nhớ tùy chọn bộ lọc và phiên đăng nhập của bạn.
            </p>
            <p>
              <strong>Về đối tác quảng cáo bên thứ ba (Google AdSense):</strong>
            </p>
            <ul className="list-disc pl-5 space-y-1.5">
              <li>
                Các nhà cung cấp bên thứ ba, bao gồm Google, sử dụng cookie để phân phát quảng cáo dựa trên các lần truy cập trước đây của người dùng vào trang web này hoặc các trang web khác trên Internet.
              </li>
              <li>
                Việc Google sử dụng cookie quảng cáo (như cookie DoubleClick/DART) cho phép Google và các đối tác phân phát quảng cáo phù hợp đến bạn dựa trên lượt truy cập vào nhadatradar.com và/hoặc các trang web khác.
              </li>
              <li>
                Người dùng có thể chọn không nhận quảng cáo được cá nhân hóa bằng cách truy cập vào trang{" "}
                <a
                  href="https://www.google.com/settings/ads"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-brand font-semibold underline"
                >
                  Cài đặt quảng cáo của Google
                </a>{" "}
                hoặc truy cập{" "}
                <a
                  href="https://www.aboutads.info/choices/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-brand font-semibold underline"
                >
                  aboutads.info
                </a>.
              </li>
            </ul>
            <p>
              <strong>Về công cụ đo lường (Google Analytics):</strong> Chúng tôi sử dụng Google Analytics để nắm bắt số lượng người truy cập và hành vi duyệt trang dưới dạng ẩn danh, không thu thập danh tính thật của bạn.
            </p>
          </div>
        </section>

        <section>
          <h2 className="text-lg font-bold text-[var(--ink)] mb-3">5. Chia sẻ thông tin với bên thứ ba</h2>
          <p>
            Chúng tôi <strong>không bao giờ bán hoặc trao đổi</strong> thông tin cá nhân của bạn cho bất kỳ bên thứ ba nào vì mục đích thương mại riêng.
            Thông tin chỉ được chia sẻ trong các trường hợp:
          </p>
          <ul className="list-disc pl-5 space-y-1.5 mt-2">
            <li>Bạn chủ động yêu cầu kết nối để nhận tư vấn mua/bán từ môi giới đối tác.</li>
            <li>Khi có yêu cầu bắt buộc bằng văn bản từ cơ quan pháp luật có thẩm quyền theo quy định của pháp luật Việt Nam.</li>
          </ul>
        </section>

        <section>
          <h2 className="text-lg font-bold text-[var(--ink)] mb-3">6. Quyền của người dùng đối với dữ liệu</h2>
          <p>
            Bạn có toàn quyền xem, chỉnh sửa hoặc xóa thông tin tài khoản của mình bất cứ lúc nào tại trang quản trị tài khoản,
            hoặc liên hệ trực tiếp với chúng tôi qua email để yêu cầu xóa toàn bộ dữ liệu cá nhân liên quan.
          </p>
        </section>

        <section className="pt-6 border-t border-[var(--line)]">
          <h2 className="text-lg font-bold text-[var(--ink)] mb-2">7. Liên hệ phản hồi</h2>
          <p>
            Mọi thắc mắc hoặc khiếu nại liên quan đến chính sách bảo mật, vui lòng liên hệ:
          </p>
          <div className="mt-3 space-y-1">
            <p><strong>Ban Quản trị NhaDat Radar</strong></p>
            <p>Hotline: <a href="tel:0387365020" className="text-brand font-bold">0387 365 020</a></p>
            <p>Email: <a href="mailto:contact@nhadatradar.com" className="text-brand">contact@nhadatradar.com</a></p>
            <p>Website: <Link href="/" className="text-brand">https://nhadatradar.com</Link></p>
          </div>
        </section>
      </div>
    </article>
  );
}
