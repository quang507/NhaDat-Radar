import type { Metadata } from "next";
import Link from "next/link";
import { ShieldCheck, Lock, Eye, Database, BellRing, Sparkles, UserCheck, Globe2 } from "lucide-react";
import { NutDoiCookie } from "@/components/DongYCookie";
import { DON_VI } from "@/lib/don-vi";

export const metadata: Metadata = {
  title: "Chính sách bảo mật thông tin | NhaDat Radar",
  description: "Chính sách bảo mật và quyền riêng tư của NhaDat Radar. Cam kết bảo vệ dữ liệu người dùng theo Luật Bảo vệ dữ liệu cá nhân 91/2025/QH15, minh bạch về AI và cookie đối tác.",
  alternates: { canonical: "/chinh-sach-bao-mat" },
};

// 2/11 (audit pháp lý docs/AUDIT-PHAP-LY-2026-11.md): bản trước nói sai với code ở 4 chỗ (che SĐT, chỉ đăng
// nhập Google, GA/Clarity "ẩn danh", điều luật về quyền) và thiếu bên nhận dữ liệu / chuyển ra nước ngoài.
// Đổi hệ thống (thêm dịch vụ bên thứ ba, đổi nơi lưu) thì sửa bảng BEN_NHAN bên dưới.
const BEN_NHAN: [string, string, string][] = [
  ["Supabase", "Cơ sở dữ liệu, đăng nhập (tài khoản, tin đăng, yêu cầu liên hệ)", "Theo vùng máy chủ của dự án"],
  ["Vercel", "Máy chủ web, xử lý biểu mẫu và trợ lý AI", "Nhật Bản (Tokyo)"],
  ["Google (Gemini)", "Xử lý tin nhắn trợ lý AI, công cụ định giá, chuẩn hoá tin đăng", "Hoa Kỳ / toàn cầu"],
  ["Google (Analytics, AdSense)", "Đo lường truy cập, phân phát quảng cáo (chỉ cá nhân hoá khi bạn đồng ý)", "Hoa Kỳ / toàn cầu"],
  ["Microsoft (Clarity)", "Bản đồ nhiệt, ghi lại phiên duyệt web (chỉ khi bạn đồng ý)", "Hoa Kỳ / toàn cầu"],
  ["Cloudflare (Turnstile)", "Chống bot ở biểu mẫu đăng nhập/đăng ký", "Toàn cầu"],
  ["Telegram, Resend (email)", "Thông báo nội bộ cho nhân viên Radar khi có yêu cầu liên hệ mới", "Toàn cầu / Hoa Kỳ"],
  ["Zalo", "Nhắn tin tư vấn khi bạn chủ động liên hệ qua Zalo", "Việt Nam"],
];

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
            1. Căn cứ pháp lý &amp; Bên kiểm soát dữ liệu
          </h2>
          <p>
            Chào mừng bạn đến với <strong>NhaDat Radar</strong> (sau đây gọi tắt là &quot;chúng tôi&quot; hoặc &quot;Hệ thống&quot;).
            Chúng tôi cam kết tôn trọng, bảo vệ quyền riêng tư và dữ liệu cá nhân của người dùng phù hợp với các quy định pháp luật Việt Nam hiện hành:
          </p>
          <ul className="list-disc pl-5 space-y-1.5 mt-2">
            <li><strong>Luật Bảo vệ dữ liệu cá nhân số 91/2025/QH15</strong> và <strong>Nghị định số 356/2025/NĐ-CP</strong> quy định chi tiết thi hành Luật (chính thức thay thế Nghị định 13/2023/NĐ-CP từ ngày 01/01/2026).</li>
            <li><strong>Luật Trí tuệ nhân tạo số 134/2025/QH15</strong> và <strong>Nghị định số 142/2026/NĐ-CP</strong> về minh bạch hệ thống AI.</li>
            <li><strong>Luật An ninh mạng số 116/2025/QH15</strong> và <strong>Luật Thương mại điện tử số 122/2025/QH15</strong>.</li>
          </ul>
          <p className="mt-3">
            Bên kiểm soát và xử lý dữ liệu: <strong className="text-[var(--ink)]">{DON_VI.ten || "NhaDat Radar"}</strong>
            {DON_VI.maSoThue && <>, MST/ĐKKD {DON_VI.maSoThue}</>}
            {DON_VI.diaChi && <>, địa chỉ {DON_VI.diaChi}</>}. Liên hệ: {DON_VI.email}.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-bold text-[var(--ink)] mb-3 flex items-center gap-2">
            <Database className="w-5 h-5 text-brand" />
            2. Thông tin chúng tôi thu thập
          </h2>
          <p className="mb-2">Chúng tôi chỉ thu thập các thông tin cần thiết để phục vụ việc tìm kiếm và giao dịch nhà đất của bạn:</p>
          <ul className="list-disc pl-5 space-y-1.5">
            <li><strong>Thông tin tài khoản:</strong> Email, mật khẩu (được mã hoá, chúng tôi không đọc được) khi bạn đăng ký bằng email; hoặc tên hiển thị, email, ảnh đại diện khi bạn đăng nhập bằng Google. Họ tên, SĐT, thông tin môi giới nếu bạn tự điền ở trang tài khoản.</li>
            <li><strong>Thông tin liên hệ tự nguyện:</strong> Họ tên, số điện thoại và lời nhắn khi bạn gửi yêu cầu tư vấn, hẹn lịch xem nhà, đăng ký dịch vụ lấp phòng, liên hệ người đăng tin hoặc gửi SĐT trong khung trợ lý AI.</li>
            <li><strong>Nội dung trò chuyện với trợ lý AI:</strong> Câu hỏi bạn gõ vào khung chat (để trả lời và cải thiện kết quả tìm kiếm).</li>
            <li><strong>Tin đăng của bạn:</strong> Nội dung, hình ảnh, địa chỉ và SĐT liên hệ bạn đăng lên (SĐT chỉ hiện khi bạn tích đồng ý).</li>
            <li><strong>Dữ liệu duyệt web &amp; thiết bị:</strong> Địa chỉ IP, loại trình duyệt, hệ điều hành, thời gian truy cập, tin đã xem, tin đã lưu và một mã nhận diện trình duyệt ngẫu nhiên. Đây là dữ liệu theo dõi hành vi trực tuyến; phần dùng cho đo lường và quảng cáo của bên thứ ba chỉ được thu khi bạn đồng ý (mục 5).</li>
          </ul>
          <p className="mt-3">
            <strong>Về số điện thoại trên tin đăng:</strong> Số điện thoại nằm trong tiêu đề và mô tả tin được tự động che trên mọi trang công khai.
            Với tin tổng hợp từ website khác và tin do người dùng tự đăng, người đã đăng nhập có thể bấm &quot;Xem SĐT&quot; để thấy số liên hệ,
            tối đa 30 tin mỗi ngày mỗi tài khoản, và mỗi lượt xem đều được ghi nhật ký để chống thu thập số điện thoại hàng loạt.
            Với tin độc quyền của Radar, số điện thoại và số nhà của chủ nhà không bao giờ hiển thị; mọi liên hệ đi qua hotline/Zalo của Radar.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-bold text-[var(--ink)] mb-3 flex items-center gap-2">
            <Eye className="w-5 h-5 text-brand" />
            3. Mục đích sử dụng &amp; thời gian lưu trữ
          </h2>
          <ul className="list-disc pl-5 space-y-1.5">
            <li>Cung cấp và duy trì các tính năng: Lưu tin yêu thích, tạo thông báo giá khu vực, đề xuất nhà đất tương tự.</li>
            <li>Liên hệ tư vấn, hẹn lịch xem nhà và kết nối bạn với người đăng tin hoặc chủ nhà theo đúng yêu cầu bạn gửi. Khi bạn gửi liên hệ cho tin do người dùng tự đăng, tên và SĐT của bạn được chuyển cho người đăng tin đó.</li>
            <li>Phân tích thống kê nhằm cải thiện tốc độ, độ chính xác của biểu đồ giá và thuật toán lọc tin rác.</li>
            <li>Ngăn chặn các hành vi gian lận, phá hoại an ninh mạng hoặc vi phạm pháp luật.</li>
          </ul>
          <p className="mt-3">
            <strong>Thời gian lưu trữ:</strong> Thông tin tài khoản được lưu đến khi bạn yêu cầu xoá. Thông tin liên hệ, lịch hẹn và nội dung trò chuyện được lưu
            trong thời gian cần thiết để tư vấn và chăm sóc giao dịch, và được xoá khi bạn yêu cầu. Nhật ký xem số điện thoại được lưu tối đa 180 ngày.
            Dữ liệu ở các dịch vụ đo lường/quảng cáo của bên thứ ba lưu theo chính sách của bên đó.
          </p>
        </section>

        <section id="ai" className="scroll-mt-24 p-5 rounded-sm bg-[var(--surface-1)] border border-[var(--border)]">
          <h2 className="text-base font-bold text-[var(--ink)] mb-3 flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-brand" />
            4. Minh bạch về Trí tuệ Nhân tạo (Luật AI số 134/2025/QH15)
          </h2>
          <div className="space-y-2 text-xs sm:text-sm">
            <p>
              Nhằm đảm bảo tính minh bạch theo Luật Trí tuệ nhân tạo số 134/2025/QH15 và Nghị định 142/2026/NĐ-CP:
            </p>
            <ul className="list-disc pl-5 space-y-1">
              <li><strong>Trợ lý AI hỗ trợ tìm kiếm:</strong> Khung chat được ghi rõ là &quot;Trợ lý AI&quot; và có thông báo ngay đầu khung chat rằng bạn đang trò chuyện với AI, không phải nhân viên. Muốn gặp nhân viên, bạn gọi hotline hoặc nhắn Zalo hiển thị trong khung chat.</li>
              <li><strong>Dữ liệu gửi cho AI:</strong> Tin nhắn bạn gõ vào khung chat được gửi tới mô hình Google Gemini để xử lý. Nếu tin nhắn có số điện thoại, hệ thống tự ghi nhận số đó thành yêu cầu tư vấn để nhân viên Radar liên hệ lại. Vui lòng không nhập thông tin nhạy cảm (số CCCD, tài khoản ngân hàng, mật khẩu…) vào khung chat.</li>
              <li><strong>Công cụ AI định giá:</strong> Mức giá ước tính tại trang Định giá được tính từ giá/m² trung vị của các tin rao cùng khu vực, sau đó mô hình AI (Google Gemini) điều chỉnh trong biên độ của dữ liệu thật. Kết quả chỉ mang tính tham khảo, không phải chứng thư thẩm định giá.</li>
            </ul>
          </div>
        </section>

        <section id="cookie" className="scroll-mt-24 p-5 rounded-sm bg-[var(--surface-1)] border border-[var(--border)]">
          <h2 className="text-base font-bold text-[var(--ink)] mb-3 flex items-center gap-2">
            <BellRing className="w-5 h-5 text-amber-600 dark:text-amber-400" />
            5. Cookie, Công nghệ theo dõi &amp; Quảng cáo Google (AdSense &amp; Analytics)
          </h2>
          <div className="space-y-3">
            <p>
              <strong>Cookie thiết yếu</strong> (phiên đăng nhập, giao diện sáng/tối, bộ lọc đã chọn) luôn được dùng vì website không hoạt động được nếu thiếu.
            </p>
            <p>
              <strong>Cookie không thiết yếu</strong> chỉ được bật khi bạn bấm &quot;Đồng ý&quot; ở thông báo cookie. Nếu bạn từ chối hoặc chưa chọn, bạn vẫn dùng được đầy đủ mọi tính năng; khi đó:
            </p>
            <ul className="list-disc pl-5 space-y-1.5">
              <li><strong>Google Analytics</strong> không ghi cookie đo lường.</li>
              <li><strong>Microsoft Clarity</strong> (bản đồ nhiệt, ghi lại phiên duyệt web) không được nạp.</li>
              <li><strong>Google AdSense</strong> chỉ hiển thị quảng cáo không cá nhân hoá.</li>
            </ul>
            <p>Khi bạn đồng ý, các nhà cung cấp bên thứ ba, bao gồm Google, sử dụng cookie để phân phát quảng cáo dựa trên các lần truy cập trước đây của bạn vào trang web này hoặc các trang web khác. Bạn có thể tắt quảng cáo cá nhân hoá bất cứ lúc nào tại{" "}
              <a href="https://www.google.com/settings/ads" target="_blank" rel="noopener noreferrer" className="text-brand font-semibold underline">Cài đặt quảng cáo của Google</a>{" "}
              hoặc{" "}
              <a href="https://www.aboutads.info/choices/" target="_blank" rel="noopener noreferrer" className="text-brand font-semibold underline">aboutads.info</a>.
            </p>
            <div className="pt-1">
              <NutDoiCookie />
            </div>
          </div>
        </section>

        <section>
          <h2 className="text-lg font-bold text-[var(--ink)] mb-3 flex items-center gap-2">
            <Globe2 className="w-5 h-5 text-brand" />
            6. Bên nhận dữ liệu &amp; Chuyển dữ liệu ra nước ngoài
          </h2>
          <p>
            Chúng tôi <strong>không bán, cho thuê hoặc thương mại hoá</strong> dữ liệu cá nhân của người dùng. Để vận hành website, dữ liệu được xử lý bởi các nhà cung cấp dịch vụ dưới đây,
            một số đặt máy chủ ở nước ngoài. Việc chuyển dữ liệu ra nước ngoài được thực hiện theo Luật Bảo vệ dữ liệu cá nhân số 91/2025/QH15.
          </p>
          <div className="mt-3 overflow-x-auto">
            <table className="w-full text-xs sm:text-sm border border-[var(--line)]">
              <thead className="bg-[var(--surface-2)] text-[var(--ink)]">
                <tr>
                  <th className="text-left font-semibold p-2 border-b border-[var(--line)]">Nhà cung cấp</th>
                  <th className="text-left font-semibold p-2 border-b border-[var(--line)]">Mục đích</th>
                  <th className="text-left font-semibold p-2 border-b border-[var(--line)]">Nơi xử lý</th>
                </tr>
              </thead>
              <tbody>
                {BEN_NHAN.map(([ten, mucDich, noi]) => (
                  <tr key={ten} className="border-b border-[var(--line)] last:border-0 align-top">
                    <td className="p-2 font-medium text-[var(--ink)]">{ten}</td>
                    <td className="p-2">{mucDich}</td>
                    <td className="p-2 whitespace-nowrap">{noi}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="mt-3">Ngoài ra, thông tin chỉ được cung cấp khi bạn chủ động yêu cầu kết nối với người đăng tin/đối tác, hoặc khi có yêu cầu bằng văn bản hợp pháp từ cơ quan nhà nước có thẩm quyền.</p>
        </section>

        <section>
          <h2 className="text-lg font-bold text-[var(--ink)] mb-3 flex items-center gap-2">
            <UserCheck className="w-5 h-5 text-brand" />
            7. Quyền của chủ thể dữ liệu (Luật 91/2025/QH15)
          </h2>
          <p className="mb-2">Bạn có đầy đủ các quyền hợp pháp đối với dữ liệu cá nhân của mình:</p>
          <ul className="list-disc pl-5 space-y-1.5">
            <li><strong>Quyền được biết &amp; Quyền đồng ý:</strong> Được biết rõ mục đích, phạm vi thu thập dữ liệu và tự do đưa ra quyết định đồng ý.</li>
            <li><strong>Quyền truy cập &amp; Chỉnh sửa:</strong> Xem và cập nhật thông tin tài khoản của mình bất cứ lúc nào tại <Link href="/account" className="text-brand underline">trang tài khoản</Link>.</li>
            <li><strong>Quyền rút lại sự đồng ý, hạn chế xử lý &amp; Yêu cầu xoá:</strong> Yêu cầu ngừng xử lý hoặc xoá dữ liệu cá nhân (kể cả xoá tài khoản) qua email {DON_VI.email} hoặc <Link href="/lien-he" className="text-brand underline">form Liên hệ</Link>. Riêng cookie, bạn đổi lựa chọn bằng nút ở mục 5.</li>
            <li><strong>Quyền khiếu nại:</strong> Gửi khiếu nại tới ban quản trị hoặc cơ quan quản lý nhà nước nếu phát hiện vi phạm về bảo vệ dữ liệu.</li>
          </ul>
          <p className="mt-3 mb-1 font-semibold text-[var(--ink)]">Thời hạn xử lý yêu cầu (Nghị định 356/2025/NĐ-CP):</p>
          <ul className="list-disc pl-5 space-y-1">
            <li>Xác nhận đã nhận yêu cầu: trong 2 ngày làm việc.</li>
            <li>Cung cấp, cho xem hoặc chỉnh sửa dữ liệu: trong 10 ngày.</li>
            <li>Rút lại sự đồng ý, hạn chế hoặc phản đối xử lý: trong 15 ngày.</li>
            <li>Xoá dữ liệu: trong 20 ngày.</li>
          </ul>
        </section>

        <section className="pt-6 border-t border-[var(--line)]">
          <h2 className="text-lg font-bold text-[var(--ink)] mb-2">8. Thông tin liên hệ &amp; Tiếp nhận yêu cầu</h2>
          <p>
            Mọi thắc mắc, đề nghị thực hiện quyền của chủ thể dữ liệu hoặc phản ánh liên quan đến chính sách bảo mật, vui lòng liên hệ:
          </p>
          <div className="mt-3 space-y-1">
            <p><strong>Bộ phận Bảo vệ dữ liệu - {DON_VI.ten || "NhaDat Radar"}</strong></p>
            {DON_VI.diaChi && <p>Địa chỉ: {DON_VI.diaChi}</p>}
            <p>Hotline hỗ trợ: <a href="tel:0387365020" className="text-brand font-bold">{DON_VI.hotline}</a></p>
            <p>Email tiếp nhận dữ liệu: <a href={`mailto:${DON_VI.email}`} className="text-brand">{DON_VI.email}</a></p>
            <p>Website chính thức: <Link href="/" className="text-brand">https://nhadatradar.com</Link></p>
          </div>
        </section>
      </div>
    </article>
  );
}
