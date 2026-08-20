import GuidePage from "@/components/GuidePage";

export const metadata = { title: "Hướng dẫn mua & thuê nhà - NhaDat Radar" };

export default function BuyerGuidePage() {
  return (
    <GuidePage
      title="Hướng Dẫn Mua & Thuê Nhà"
      subtitle="Mọi thứ bạn cần biết để tìm và sở hữu (hoặc thuê) ngôi nhà mơ ước một cách an toàn"
      cta="Bắt Đầu Tìm Kiếm Bất Động Sản"
      ctaHref="/search"
      steps={[
        {
          title: "Xác Định Nhu Cầu",
          desc: "Xác định rõ những gì bạn đang tìm kiếm trước khi bắt đầu.",
          items: ["Lập kế hoạch ngân sách", "Ưu tiên vị trí", "Đặc điểm bất động sản"],
          legal: "Xác định giới hạn tài chính thực tế (kể cả thuế, phí sang tên) trước khi cam kết bất kỳ giao dịch nào.",
          tip: "Lập danh sách ưu tiên (vị trí, diện tích, số phòng) để tập trung trong quá trình tìm kiếm.",
        },
        {
          title: "Chuẩn Bị Tài Chính",
          desc: "Đảm bảo nguồn tiền trước khi bắt đầu tìm kiếm nghiêm túc.",
          items: ["Ước tính khoản vay", "So sánh ngân hàng", "Chuẩn bị hồ sơ", "Xác nhận ngân sách"],
          legal: "Phê duyệt sơ bộ của ngân hàng không phải là bảo đảm giải ngân cuối cùng - đọc kỹ điều kiện.",
          tip: "Dùng Máy tính lãi vay của chúng tôi (/tinh-lai-vay) để ước tính khoản trả hàng tháng trước khi quyết định.",
        },
        {
          title: "Tìm Người Bán Uy Tín",
          desc: "Làm việc với người bán / môi giới am hiểu thị trường khu vực.",
          items: ["Chọn người bán", "Chuyên môn thị trường", "Phong cách giao tiếp"],
          legal: "Kiểm tra thông tin người bán, ưu tiên tin có nhãn “chính chủ” và điểm tin cậy AI cao.",
          tip: "NhaDat Radar tự phân loại tin chính chủ / môi giới và cảnh báo giá ảo - hãy để ý các nhãn trên thẻ tin.",
        },
        {
          title: "Bắt Đầu Tìm Kiếm",
          desc: "Duyệt bất động sản trên bản đồ và lên lịch xem thực tế.",
          items: ["Nghiên cứu trực tuyến", "Xem nhà thực tế", "Ghi chép so sánh"],
          legal: "Đừng chỉ dựa vào mô tả và hình ảnh - luôn xem trực tiếp trước khi đặt cọc.",
          tip: "Ghé thăm khu vực vào các thời điểm khác nhau (sáng/tối, ngày thường/cuối tuần) để cảm nhận thực tế.",
        },
        {
          title: "Đàm Phán & Đặt Cọc",
          desc: "Đưa ra đề nghị cạnh tranh cho bất động sản bạn chọn.",
          items: ["Phân tích giá thị trường", "Chiến lược đàm phán", "Tiền đặt cọc"],
          legal: "Mọi thoả thuận đặt cọc phải lập bằng văn bản với điều khoản rõ ràng về phạt cọc.",
          tip: "So sánh giá/m² của tin với mặt bằng khu vực tại trang Thống kê trước khi trả giá.",
        },
        {
          title: "Thẩm Định & Công Chứng",
          desc: "Kiểm tra pháp lý và hoàn tất thủ tục sang tên / hợp đồng thuê.",
          items: ["Kiểm tra sổ đỏ/sổ hồng", "Kiểm tra quy hoạch", "Công chứng hợp đồng", "Nộp thuế & phí"],
          legal: "Nhờ luật sư hoặc công chứng viên xem xét toàn bộ hồ sơ pháp lý trước khi ký và thanh toán.",
          tip: "Giữ mọi giấy tờ giao dịch có tổ chức - cần cho thuế và tranh chấp (nếu có) sau này.",
        },
        {
          title: "Nhận Nhà & Ổn Định",
          desc: "Hoàn thành quá trình chuyển đến ngôi nhà mới.",
          items: ["Bàn giao & kiểm kê", "Chuyển đổi điện nước", "Đăng ký tạm trú"],
          legal: "Lập biên bản bàn giao hiện trạng (kèm ảnh) khi nhận nhà, đặc biệt với nhà thuê.",
          tip: "Chụp ảnh toàn bộ hiện trạng nhà trước khi chuyển vào để đối chiếu khi kết thúc hợp đồng.",
        },
      ]}
      legalTitle="Lời Khuyên Pháp Lý Cho Người Mua & Thuê"
      legalPoints={[
        ["Kiểm tra trước giao dịch", "Luôn kiểm tra kỹ hiện trạng và pháp lý bất động sản trước khi xuống tiền."],
        ["Xem xét kỹ hợp đồng", "Nhờ luật sư bất động sản xem xét tất cả tài liệu trước khi ký."],
        ["Hiểu về quyền sở hữu", "Đảm bảo bất động sản có sổ rõ ràng, không thế chấp, không tranh chấp, không vướng quy hoạch."],
        ["Biết quyền của bạn", "Nắm luật đất đai, luật nhà ở và các quy định bảo vệ người mua/thuê."],
        ["Lưu trữ mọi thứ", "Giữ bản sao mọi trao đổi, thoả thuận và tài liệu giao dịch."],
      ]}
      endTitle="Sẵn Sàng Bắt Đầu Hành Trình Tìm Nhà?"
    />
  );
}
