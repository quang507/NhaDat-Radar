export interface ChuyenDeSEO {
  slug: string;
  title: string;
  metaTitle: string;
  metaDesc: string;
  h1: string;
  leadText: string;
  deal: "cho_thue" | "ban";
  filterType: "price_lte" | "price_range" | "keyword" | "kind_or_keyword";
  priceMax?: number;
  priceMin?: number;
  keywords?: string[];
  mucGiaPhoBien: string;
  khuVucNhieuTin: string[];
  faq: { q: string; a: string }[];
}

export const DANH_SACH_CHUYEN_DE: Record<string, ChuyenDeSEO> = {
  "phong-tro-duoi-3-trieu": {
    slug: "phong-tro-duoi-3-trieu",
    title: "Phòng Trọ Dưới 3 Triệu TP.HCM",
    metaTitle: "Phòng Trọ Dưới 3 Triệu TP.HCM - Giá Rẻ, Chính Chủ, Mới Nhất 2026",
    metaDesc: "Tổng hợp phòng trọ dưới 3 triệu tại TP.HCM. Đầy đủ tiện ích, có gác lửng, WC riêng, giờ giấc tự do, an ninh tốt. Tin đăng xác minh chính chủ, cập nhật mỗi ngày.",
    h1: "Phòng Trọ Dưới 3 Triệu TP.HCM Giá Rẻ, Chính Chủ",
    leadText: "Danh sách phòng trọ cho thuê phân khúc bình dân dưới 3 triệu đồng/tháng tại TP.HCM, phù hợp cho học sinh, sinh viên và người mới đi làm cần tối ưu chi phí sinh hoạt.",
    deal: "cho_thue",
    filterType: "price_lte",
    priceMax: 3000000,
    mucGiaPhoBien: "2.0 - 2.8 triệu/tháng",
    khuVucNhieuTin: ["Gò Vấp", "Bình Tân", "Quận 12", "TP. Thủ Đức", "Tân Phú", "Bình Thạnh (hẻm)"],
    faq: [
      {
        q: "Khu vực nào ở TP.HCM có nhiều phòng trọ dưới 3 triệu nhất?",
        a: "Các quận có nguồn cung phòng trọ dưới 3 triệu dồi dào nhất gồm Gò Vấp (Lê Đức Thọ, Quang Trung), Bình Tân, Quận 12 (An Phú Đông, Tân Thới Hiệp), TP. Thủ Đức (Linh Xuân, Tăng Nhơn Phú) và Tân Phú."
      },
      {
        q: "Phòng trọ dưới 3 triệu thường có những tiện ích gì?",
        a: "Với tầm giá 2.0 - 3.0 triệu, bạn thường thuê được phòng diện tích 15 - 22m2 có gác lửng, nhà vệ sinh riêng khép kín, bồn rửa chén và chỗ để xe an ninh. Một số phòng có sẵn máy lạnh hoặc quạt trần."
      },
      {
        q: "Làm sao để tránh lừa đảo tiền cọc khi thuê phòng giá rẻ?",
        a: "Tuyệt đối không chuyển tiền cọc giữ chỗ khi chưa đến tận nơi xem phòng thực tế. Luôn gặp trực tiếp chủ nhà hoặc quản lý tòa nhà, kiểm tra hợp đồng rõ ràng về mức giá điện nước và cam kết hoàn cọc."
      }
    ]
  },
  "phong-tro-co-gac-lung": {
    slug: "phong-tro-co-gac-lung",
    title: "Phòng Trọ Có Gác Lửng TP.HCM",
    metaTitle: "Cho Thuê Phòng Trọ Có Gác Lửng TP.HCM - Rộng Rãi, Sạch Sẽ, Giá Tốt",
    metaDesc: "Tìm phòng trọ có gác lửng cao, không đụng đầu tại TP.HCM. Không gian sinh hoạt rộng rãi, tách biệt chỗ ngủ và khu nấu ăn. Giá từ 2.5 - 5 triệu/tháng.",
    h1: "Phòng Trọ Có Gác Lửng Rộng Rãi Tại TP.HCM",
    leadText: "Tổng hợp các mẫu phòng trọ có gác lửng đúc kiên cố, trần cao thoáng đãng tại TP.HCM. Thiết kế tối ưu không gian sinh hoạt, tách biệt khu vực ngủ và tiếp khách, phù hợp cho 2-3 người ở cùng.",
    deal: "cho_thue",
    filterType: "keyword",
    keywords: ["gác", "gác lửng", "gac lung", "duplex", "mezzanine"],
    mucGiaPhoBien: "2.8 - 4.5 triệu/tháng",
    khuVucNhieuTin: ["Bình Thạnh", "Gò Vấp", "Quận 7", "TP. Thủ Đức", "Tân Bình", "Quận 10"],
    faq: [
      {
        q: "Nên chọn phòng trọ gác đúc bê tông hay gác ván ép/gỗ?",
        a: "Nên ưu tiên gác đúc bê tông lót gạch men vì chịu lực tốt, cách âm êm ái khi đi lại và mát hơn. Gác ván gỗ ép thường dễ phát tiếng kêu cọt kẹt và dễ hấp thụ nhiệt gây nóng vào buổi trưa."
      },
      {
        q: "Chiều cao gác lửng bao nhiêu là đạt chuẩn không bị đụng đầu?",
        a: "Chiều cao lý tưởng từ mặt sàn trọ lên đáy gác là khoảng 2.0 - 2.2m, và từ sàn gác lên trần nhà tối thiểu 1.4 - 1.8m để người lớn có thể di chuyển và ngồi thoải mái mà không bị gò bó."
      },
      {
        q: "Phòng trọ có gác ở được tối đa bao nhiêu người?",
        a: "Phòng trọ có gác diện tích sàn từ 18 - 25m2 thường ở thoải mái từ 2 - 3 người, vừa tiết kiệm chi phí sinh hoạt vừa có không gian riêng tư."
      }
    ]
  },
  "can-ho-mini-full-noi-that": {
    slug: "can-ho-mini-full-noi-that",
    title: "Căn Hộ Mini Full Nội Thất TP.HCM",
    metaTitle: "Căn Hộ Mini Full Nội Thất TP.HCM - Studio Đẹp, Giờ Giấc Tự Do",
    metaDesc: "Thuê căn hộ mini, studio dịch vụ full nội thất cao cấp tại TP.HCM: giường nệm, tủ áo, máy lạnh, tủ lạnh, máy giặt, bếp riêng, thang máy, an ninh 24/7.",
    h1: "Căn Hộ Mini / Studio Full Nội Thất TP.HCM",
    leadText: "Tuyển chọn căn hộ mini, studio dịch vụ và duplex trang bị trọn gói nội thất hiện đại tại các quận trung tâm TP.HCM. Khách thuê chỉ cần xách vali vào ở, giờ giấc tự do, bảo vệ 24/7.",
    deal: "cho_thue",
    filterType: "kind_or_keyword",
    keywords: ["full nội thất", "nội thất", "studio", "căn hộ mini", "chdv", "dịch vụ"],
    mucGiaPhoBien: "4.5 - 7.5 triệu/tháng",
    khuVucNhieuTin: ["Bình Thạnh", "Quận 1", "Quận 3", "Quận 7", "Phú Nhuận", "Quận 10", "Tân Bình"],
    faq: [
      {
        q: "Căn hộ mini full nội thất thường bàn giao gồm những món đồ gì?",
        a: "Thông thường bao gồm: Máy lạnh Inverter, tủ lạnh, giường bọc nệm cao su non, tủ quần áo lớn, bàn làm việc, kệ bếp mặt đá kèm bồn rửa, máy nước nóng năng lượng mặt trời và máy giặt sấy chung hoặc riêng."
      },
      {
        q: "Chi phí điện nước và phí quản lý căn hộ dịch vụ tính thế nào?",
        a: "Điện thường tính từ 3.800 - 4.200đ/kWh; Nước từ 100.000đ/người hoặc 25.000 - 30.000đ/m3; Phí quản lý dịch vụ (wifi, thang máy, rác, dọn dẹp hành lang, bảo vệ) từ 150.000 - 250.000đ/phòng/tháng."
      },
      {
        q: "Căn hộ mini có cho phép nuôi thú cưng (pet) không?",
        a: "Khoảng 40% tòa nhà cho phép nuôi thú cưng nhỏ (mèo, cún cảnh) với cam kết giữ vệ sinh chung và không gây tiếng ồn. Bạn nên hỏi rõ người quản lý trước khi đặt cọc."
      }
    ]
  }
};
