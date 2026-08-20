import GuidePage from "@/components/GuidePage";

export const metadata = { title: "Hướng dẫn bán bất động sản - NhaDat Radar" };

export default function SellerGuidePage() {
  return (
    <GuidePage
      title="Hướng Dẫn Người Bán"
      subtitle="Mọi thứ bạn cần biết về việc bán bất động sản thành công, nhanh và đúng giá"
      cta="Bắt Đầu Đăng Tin"
      ctaHref="/ban"
      steps={[
        {
          title: "Chuẩn Bị Bất Động Sản",
          desc: "Chuẩn bị ngôi nhà của bạn cho thị trường để thu hút người mua tiềm năng.",
          items: ["Định giá bất động sản", "Dọn dẹp & trang trí", "Sửa chữa và cải thiện"],
          legal: "Đảm bảo giấy tờ (sổ đỏ/sổ hồng, hoàn công) được cập nhật và tuân thủ pháp luật.",
          tip: "Ấn tượng đầu tiên rất quan trọng - đầu tư vào mặt tiền và ánh sáng để thu hút nhiều người mua hơn.",
        },
        {
          title: "Chụp Ảnh Chuyên Nghiệp",
          desc: "Giới thiệu bất động sản của bạn với hình ảnh chất lượng cao.",
          items: ["Ảnh sáng đẹp, đủ góc", "Quay video/tour", "Làm nổi bật điểm mạnh"],
          legal: "Hình ảnh phải thể hiện chính xác tình trạng bất động sản, không gây hiểu lầm.",
          tip: "Ánh sáng tự nhiên buổi sáng tạo ra những bức ảnh bất động sản hấp dẫn nhất.",
        },
        {
          title: "Đặt Giá Phù Hợp",
          desc: "Định giá cạnh tranh để thu hút người mua thật.",
          items: ["Phân tích thị trường", "So giá khu vực", "Định giá chiến lược"],
          legal: "Khai giá trung thực trong hợp đồng - khai thấp để né thuế là rủi ro pháp lý lớn.",
          tip: "Định giá quá cao khiến tin “ế” lâu và cuối cùng bán thấp hơn. Xem giá/m² khu vực tại trang Thống kê.",
        },
        {
          title: "Đăng Tin & Tiếp Thị",
          desc: "Tiếp cận đúng người mua với chiến lược tiếp thị hiệu quả.",
          items: ["Đăng tin trên NhaDat Radar", "Chia sẻ mạng xã hội", "Mở cửa cho xem nhà"],
          legal: "Nội dung tin đăng phải đúng sự thật về diện tích, pháp lý, hiện trạng.",
          tip: "Tin có ảnh đẹp + mô tả chi tiết + giá hợp lý được AI chấm điểm cao và hiển thị nổi bật hơn.",
        },
        {
          title: "Xem Xét & Đàm Phán",
          desc: "Đánh giá đề nghị và đàm phán các điều khoản thuận lợi.",
          items: ["Sàng lọc người mua", "Đàm phán giá & điều khoản", "Thoả thuận đặt cọc"],
          legal: "Mọi thoả thuận (kể cả đặt cọc) phải được lập bằng văn bản.",
          tip: "Đề nghị cao nhất không phải lúc nào cũng tốt nhất - xem xét khả năng tài chính và tiến độ thanh toán.",
        },
        {
          title: "Thẩm Định & Công Chứng",
          desc: "Hỗ trợ người mua kiểm tra và chuẩn bị hồ sơ công chứng.",
          items: ["Tạo điều kiện xem xét", "Chuẩn bị hồ sơ", "Công chứng hợp đồng"],
          legal: "Công khai các khuyết tật đã biết của bất động sản để tránh trách nhiệm pháp lý sau này.",
          tip: "Phản hồi nhanh các yêu cầu của người mua để giữ giao dịch tiến triển.",
        },
        {
          title: "Hoàn Tất Việc Bán",
          desc: "Hoàn thành giao dịch và chuyển quyền sở hữu.",
          items: ["Nhận thanh toán", "Ký hồ sơ sang tên", "Bàn giao nhà & chìa khóa"],
          legal: "Giữ bản sao toàn bộ hồ sơ giao dịch cho mục đích thuế thu nhập cá nhân.",
          tip: "Lên kế hoạch chuyển đi trùng với ngày bàn giao để tránh phát sinh chi phí.",
        },
      ]}
      legalTitle="Lời Khuyên Pháp Lý Cho Người Bán"
      legalPoints={[
        ["Nghĩa vụ công khai", "Hiểu nghĩa vụ công khai khuyết tật và vấn đề của bất động sản cho người mua."],
        ["Nghĩa vụ thuế", "Tham khảo chuyên gia thuế về thuế thu nhập cá nhân và lệ phí trước bạ."],
        ["Xem xét hợp đồng", "Mọi thoả thuận mua bán nên được luật sư có chuyên môn xem xét."],
        ["Sổ sách & thế chấp", "Giải chấp và làm rõ quyền sở hữu trước khi niêm yết bán."],
        ["Trung thực khi tiếp thị", "Thông tin tin đăng phải đúng thực tế - nền tảng sẽ gỡ tin sai phạm."],
      ]}
      endTitle="Sẵn Sàng Bán Bất Động Sản?"
    />
  );
}
