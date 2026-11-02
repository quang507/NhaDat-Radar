import type { Metadata } from "next";
import Link from "next/link";
import { ShieldCheck, Lock, Eye, Database, BellRing, Sparkles, UserCheck } from "lucide-react";

export const metadata: Metadata = {
  title: "Chính sách bảo mật thông tin | NhaDat Radar",
  description: "Chính sách bảo mật và quyền riêng tư của NhaDat Radar. Cam kết bảo vệ dữ liệu người dùng theo Luật Bảo vệ dữ liệu cá nhân 91/2025/QH15, minh bạch về AI và cookie đối tác.",
  alternates: { canonical: "/chinh-sach-bao-mat" },
};

export default function ChinhSachBaoMatPage() {
  return (
    <article className="max-w-4xl mx-auto py-8 text-[var(--ink)] px-4 sm:px-6">
      <header className="mb-10 pb-6 border-b border-[var(--line)]">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 text-xs font-semibold mb-3">
          <ShieldCheck className="w-4 h-4" />
          Quyền riêng tư &amp; Bảo vệ dữ liệu cá nhân
        </div>
        <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight">Chính Sách Bảo Mật</h1>
        <p className="mt-2 text-sm text-[var(--ink-soft)]">
          Cập nhật ngày 02 tháng 11 năm 2026 · Tuân thủ Luật Bảo vệ dữ liệu cá nhân số 91/2025/QH15 &amp; Nghị định 356/2025/NĐ-CP
        </p>
      </header>

      <div className="space-y-8 text-sm leading-relaxed text-[var(--ink-soft)]">
        <section>
          <h2 className="text-lg font-bold text-[var(--ink)] mb-3 flex items-center gap-2">
            <Lock className="w-5 h-5 text-brand" />
            1. Căn cứ pháp lý &amp; Cam kết chung
          </h2>
          <p>
            Chào mừng bạn đến với <strong>NhaDat Radar</strong> (sau đây gọi tắt là &quot;chúng tôi&quot; hoặc &quot;Hệ thống&quot;).
            Chúng tôi cam kết tôn trọng, bảo vệ tối đa quyền riêng tư và dữ liệu cá nhân của người dùng phù hợp với các quy định pháp luật Việt Nam hiện hành:
          </p>
          <ul className="list-disc pl-5 space-y-1.5 mt-2">
            <li><strong>Luật Bảo vệ dữ liệu cá nhân số 91/2025/QH15</strong> và <strong>Nghị định số 356/2025/NĐ-CP</strong> quy định chi tiết thi hành Luật (chính thức thay thế Nghị định 13/2023/NĐ-CP từ ngày 01/01/2026).</li>
            <li><strong>Luật Trí tuệ nhân tạo số 134/2025/QH15</strong> và <strong>Nghị định số 142/2026/NĐ-CP</strong> về minh bạch hệ thống AI.</li>
            <li><strong>Luật An ninh mạng số 116/2025/QH15</strong> và <strong>Luật Thương mại điện tử số 122/2025/QH15</strong>.</li>
          </ul>
        </section>

        <section>
          <h2 className="text-lg font-bold text-[var(--ink)] mb-3 flex items-center gap-2">
            <Database className="w-5 h-5 text-brand" />
            2. Thông tin chúng tôi thu thập
          </h2>
          <p className="mb-2">Chúng tôi chỉ thu thập các thông tin tối thiểu cần thiết nhằm phục vụ trải nghiệm tìm kiếm nhà đất của bạn:</p>
          <ul className="list-disc pl-5 space-y-1.5">
            <li><strong>Thông tin tài khoản:</strong> Tên hiển thị, địa chỉ email, ảnh đại diện khi bạn chủ động đăng nhập qua Google OAuth.</li>
            <li><strong>Thông tin liên hệ tự nguyện:</strong> Số điện thoại nếu bạn để lại yêu cầu tư vấn, hẹn lịch xem phòng/nhà hoặc liên hệ hỗ trợ.</li>
            <li><strong>Dữ liệu duyệt web &amp; Thiết bị:</strong> Địa chỉ IP, loại trình duyệt, hệ điều hành, thời gian truy cập, lịch sử xem tin, bộ lọc tìm kiếm yêu thích nhằm tối ưu hóa gợi ý bất động sản.</li>
            <li><strong>Bảo vệ số điện thoại công khai:</strong> Toàn bộ số điện thoại liên hệ trên các tin đăng tổng hợp đều được hệ thống che mờ tự động (masking) nhằm bảo vệ quyền riêng tư cá nhân và chống thu thập số điện thoại hàng loạt trái phép.</li>
          </ul>
        </section>

        <section>
          <h2 className="text-lg font-bold text-[var(--ink)] mb-3 flex items-center gap-2">
            <Eye className="w-5 h-5 text-brand" />
            3. Mục đích sử dụng thông tin
          </h2>
          <ul className="list-disc pl-5 space-y-1.5">
            <li>Cung cấp và duy trì các tính năng: Lưu tin yêu thích, tạo thông báo giá khu vực, đề xuất nhà đất tương tự.</li>
            <li>Kết nối người mua/thuê với môi giới hoặc chủ phòng uy tín theo đúng yêu cầu tự nguyện của người dùng.</li>
            <li>Phân tích thống kê ẩn danh nhằm cải thiện tốc độ, độ chính xác của biểu đồ giá và thuật toán lọc tin rác.</li>
            <li>Ngăn chặn các hành vi gian lận, phá hoại an ninh mạng hoặc vi phạm pháp luật.</li>
          </ul>
        </section>

        <section className="p-5 rounded-2xl bg-[var(--surface-1)] border border-[var(--border)]">
          <h2 className="text-base font-bold text-[var(--ink)] mb-3 flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-brand" />
            4. Minh bạch về Trí tuệ Nhân tạo (Luật AI số 134/2025/QH15)
          </h2>
          <div className="space-y-2 text-xs sm:text-sm">
            <p>
              Nhằm đảm bảo tính minh bạch theo Luật Trí tuệ nhân tạo số 134/2025/QH15 và Nghị định 142/2026/NĐ-CP:
            </p>
            <ul className="list-disc pl-5 space-y-1">
              <li><strong>Trợ lý AI hỗ trợ tìm kiếm:</strong> Khung chat tự động trên website được gắn nhãn rõ ràng là &quot;Trợ lý AI&quot;. Người dùng luôn nhận biết mình đang tương tác với hệ thống trí tuệ nhân tạo hỗ trợ tra cứu thông tin phòng.</li>
              <li><strong>Công cụ AI định giá:</strong> Các mức giá ước tính tại trang Định giá do thuật toán máy học phân tích từ dữ liệu thị trường công khai, mang tính chất tham khảo khoa học và không cấu thành chứng thư thẩm định giá pháp lý ràng buộc.</li>
            </ul>
          </div>
        </section>

        <section className="p-5 rounded-2xl bg-[var(--surface-1)] border border-[var(--border)]">
          <h2 className="text-base font-bold text-[var(--ink)] mb-3 flex items-center gap-2">
            <BellRing className="w-5 h-5 text-amber-600 dark:text-amber-400" />
            5. Cookie, Công nghệ theo dõi &amp; Quảng cáo Google (AdSense &amp; Analytics)
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
              <strong>Về công cụ đo lường (Google Analytics &amp; Clarity):</strong> Chúng tôi sử dụng các công cụ đo lường để nắm bắt lưu lượng người truy cập và hiệu năng duyệt trang dưới dạng dữ liệu tổng hợp ẩn danh, không thu thập danh tính thật của bạn.
            </p>
          </div>
        </section>

        <section>
          <h2 className="text-lg font-bold text-[var(--ink)] mb-3">6. Chia sẻ thông tin với bên thứ ba</h2>
          <p>
            Chúng tôi <strong>không bao giờ bán, cho thuê hoặc thương mại hóa</strong> dữ liệu cá nhân của người dùng. Thông tin chỉ được xử lý hoặc cung cấp trong các trường hợp:
          </p>
          <ul className="list-disc pl-5 space-y-1.5 mt-2">
            <li>Bạn chủ động yêu cầu kết nối để nhận tư vấn mua/bán/thuê phòng từ đối tác của Radar.</li>
            <li>Khi có yêu cầu bằng văn bản hợp pháp từ cơ quan bảo vệ pháp luật có thẩm quyền theo quy định của pháp luật Việt Nam.</li>
          </ul>
        </section>

        <section>
          <h2 className="text-lg font-bold text-[var(--ink)] mb-3 flex items-center gap-2">
            <UserCheck className="w-5 h-5 text-brand" />
            7. Quyền của chủ thể dữ liệu (Theo Điều 9 Luật 91/2025/QH15)
          </h2>
          <p className="mb-2">Bạn có đầy đủ các quyền hợp pháp đối với dữ liệu cá nhân của mình:</p>
          <ul className="list-disc pl-5 space-y-1.5">
            <li><strong>Quyền được biết &amp; Quyền đồng ý:</strong> Được biết rõ mục đích, phạm vi thu thập dữ liệu và tự do đưa ra quyết định đồng ý.</li>
            <li><strong>Quyền truy cập &amp; Chỉnh sửa:</strong> Xem và cập nhật thông tin tài khoản của mình bất cứ lúc nào tại trang quản trị tài khoản cá nhân.</li>
            <li><strong>Quyền rút lại sự đồng ý &amp; Quyền yêu cầu xóa:</strong> Yêu cầu hệ thống ngừng xử lý hoặc xóa vĩnh viễn dữ liệu cá nhân của mình bằng cách gửi email về contact@nhadatradar.com.</li>
            <li><strong>Quyền khiếu nại:</strong> Gửi khiếu nại tới ban quản trị hoặc cơ quan quản lý nhà nước nếu phát hiện vi phạm về bảo vệ dữ liệu.</li>
          </ul>
        </section>

        <section className="pt-6 border-t border-[var(--line)]">
          <h2 className="text-lg font-bold text-[var(--ink)] mb-2">8. Thông tin liên hệ &amp; Tiếp nhận yêu cầu</h2>
          <p>
            Mọi thắc mắc, đề nghị thực hiện quyền của chủ thể dữ liệu hoặc phản ánh liên quan đến chính sách bảo mật, vui lòng liên hệ:
          </p>
          <div className="mt-3 space-y-1">
            <p><strong>Ban Quản trị &amp; Bộ phận Bảo vệ dữ liệu - NhaDat Radar</strong></p>
            <p>Hotline hỗ trợ: <a href="tel:0387365020" className="text-brand font-bold">0387 365 020</a></p>
            <p>Email tiếp nhận dữ liệu: <a href="mailto:contact@nhadatradar.com" className="text-brand">contact@nhadatradar.com</a></p>
            <p>Website chính thức: <Link href="/" className="text-brand">https://nhadatradar.com</Link></p>
          </div>
        </section>
      </div>
    </article>
  );
}
