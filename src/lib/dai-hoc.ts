export interface TruongDaiHoc {
  id: string;
  slug: string;
  ten: string;
  tenVietTat: string;
  logo?: string;
  diaChi: string;
  quan: string[]; // Các quận có cơ sở hoặc lân cận sinh viên hay ở
  phuong?: string[];
  mucGiaTB: string;
  khoangGia: { min: number; max: number }; // VND
  khuVucThueTot: string[];
  moTa: string;
  tuKhoa: string[];
  faq: { q: string; a: string }[];
}

export const DANH_SACH_DAI_HOC: TruongDaiHoc[] = [
  {
    id: "hutech",
    slug: "hutech",
    ten: "Đại học Công nghệ TP.HCM (HUTECH)",
    tenVietTat: "HUTECH",
    diaChi: "475A Điện Biên Phủ, P.25, Q. Bình Thạnh & Khu CNC, TP. Thủ Đức",
    quan: ["Bình Thạnh", "Thủ Đức"],
    phuong: ["Phường 25", "Phường 24", "Phường 26", "Tăng Nhơn Phú A"],
    mucGiaTB: "3.5 - 5.5 triệu/tháng",
    khoangGia: { min: 3000000, max: 6000000 },
    khuVucThueTot: ["D2 (Nguyễn Gia Trí)", "D5", "Ung Văn Khiêm", "Xô Viết Nghệ Tĩnh", "Đường Man Thiện (Thủ Đức)"],
    moTa: "HUTECH có 2 cụm cơ sở lớn nhất tại Điện Biên Phủ/Ung Văn Khiêm (Bình Thạnh) và Khu Công Nghệ Cao (TP. Thủ Đức). Sinh viên cơ sở Bình Thạnh ưu tiên thuê phòng quanh D2, D5, Ung Văn Khiêm để tiện đi bộ đến giảng đường. Sinh viên cơ sở Thủ Đức tập trung thuê tại đường Man Thiện, Lê Văn Việt với giá mềm hơn.",
    tuKhoa: ["hutech", "bình thạnh", "ung văn khiêm", "nguyễn gia trí", "d2", "d5", "điện biên phủ", "man thiện"],
    faq: [
      {
        q: "Giá thuê phòng trọ gần ĐH HUTECH Bình Thạnh khoảng bao nhiêu?",
        a: "Khu vực quanh HUTECH Bình Thạnh (D2, D5, Ung Văn Khiêm) có giá phòng dao động từ 3.5 - 5.5 triệu/tháng cho phòng studio đầy đủ tiện nghi, có máy lạnh, gác lửng. Nếu ở ghép hoặc tìm phòng nhỏ trong hẻm sâu, mức giá từ 2.5 - 3.2 triệu/tháng."
      },
      {
        q: "Sinh viên HUTECH cơ sở Khu Công nghệ cao nên thuê trọ ở đường nào?",
        a: "Sinh viên học tại Viện Công nghệ Cao HUTECH (Quận 9 cũ) nên thuê phòng tại trục đường Man Thiện, Lê Văn Việt hoặc khu dân cư Tăng Nhơn Phú A. Giá phòng tại đây rẻ hơn Bình Thạnh khoảng 30%, trung bình 2.2 - 3.8 triệu/tháng."
      },
      {
        q: "Khu vực D2, Ung Văn Khiêm có bị ngập nước vào mùa mưa không?",
        a: "Đường Nguyễn Gia Trí (D2 cũ) và trục Ung Văn Khiêm đoạn gần ngã tư Đài Liệt Sĩ trước đây có điểm trũng ngập khi triều cường kết hợp mưa to. Hiện nay hệ thống thoát nước đã cải tạo đáng kể, tuy nhiên bạn nên ưu tiên thuê phòng trọ ở tầng 1 trở lên."
      }
    ]
  },
  {
    id: "bach-khoa-tphcm",
    slug: "bach-khoa-tphcm",
    ten: "Đại học Bách Khoa ĐHQG-HCM",
    tenVietTat: "HCMUT",
    diaChi: "268 Lý Thường Kiệt, P.14, Quận 10 & Cơ sở Dĩ An, Làng Đại học",
    quan: ["Quận 10", "Quận 11", "Tân Bình", "Thủ Đức"],
    phuong: ["Phường 14", "Phường 15", "Đông Hòa"],
    mucGiaTB: "3.0 - 5.0 triệu/tháng",
    khoangGia: { min: 2800000, max: 5500000 },
    khuVucThueTot: ["Tô Hiến Thành", "Đồng Nai", "Bắc Hải", "Lữ Gia", "Lê Đại Hành", "Khu Làng Đại Học"],
    moTa: "Bách Khoa có cơ sở 1 nằm tại ngã tư Lý Thường Kiệt - Tô Hiến Thành (Quận 10), giáp ranh Quận 11 và Tân Bình. Sinh viên Bách Khoa thường tìm phòng trọ tại cư xá Bắc Hải, hẻm Lữ Gia, đường Tô Hiến Thành và Thiên Phước.",
    tuKhoa: ["bách khoa", "quận 10", "lý thường kiệt", "tô hiến thành", "bắc hải", "lữ gia"],
    faq: [
      {
        q: "Khu vực nào thuê trọ gần ĐH Bách Khoa Q10 an ninh và tiện nhất?",
        a: "Cư xá Bắc Hải, khu cư xá Lữ Gia và các hẻm đường Đồng Nai, Cửu Long là những khu vực an ninh cao, yên tĩnh, đầy đủ quán ăn sinh viên và cách trường chỉ 5 - 10 phút đi bộ."
      },
      {
        q: "Mức giá trung bình phòng trọ cho sinh viên Bách Khoa là bao nhiêu?",
        a: "Tại Quận 10, giá phòng khép kín cơ bản khoảng 3.0 - 4.5 triệu/tháng. Nếu thuê căn hộ mini hoặc studio dịch vụ full nội thất giá từ 4.5 - 6 triệu/tháng. Nhiều bạn chọn ở ghép 2-3 người để chia chi phí chỉ còn 1.5 - 2 triệu/người."
      }
    ]
  },
  {
    id: "kinh-te-tphcm-ueh",
    slug: "kinh-te-tphcm-ueh",
    ten: "Đại học Kinh tế TP.HCM (UEH)",
    tenVietTat: "UEH",
    diaChi: "59C Nguyễn Đình Chiểu (Q.3), Đào Duy Từ (Q.10), Nam Sài Gòn (Bình Chánh)",
    quan: ["Quận 3", "Quận 10", "Quận 8", "Bình Chánh"],
    phuong: ["Phường Võ Thị Sáu", "Phong Phú"],
    mucGiaTB: "3.5 - 6.0 triệu/tháng",
    khoangGia: { min: 3000000, max: 6500000 },
    khuVucThueTot: ["Nguyễn Đình Chiểu", "Võ Văn Tần", "Trục Phạm Hùng (Q.8)", "KDC Mizuki / Phong Phú (Cơ sở Nam Sài Gòn)"],
    moTa: "UEH có nhiều cơ sở trải dài từ Quận 3, Quận 10 đến Cơ sở Nam Sài Gòn (Bình Chánh). Sinh viên cơ sở trung tâm hay tìm trọ tại các hẻm Quận 3, Phú Nhuận hoặc giáp ranh Quận 10. Sinh viên học tại CS Nam Sài Gòn tập trung thuê phòng tại trục Nguyễn Văn Linh, Phạm Hùng (Q.8, Bình Chánh).",
    tuKhoa: ["ueh", "kinh tế tphcm", "nguyễn đình chiểu", "nguyễn văn linh", "đào duy từ"],
    faq: [
      {
        q: "Sinh viên UEH học cơ sở Nam Sài Gòn nên thuê trọ ở đâu thuận tiện?",
        a: "Bạn nên thuê phòng tại trục Phạm Hùng (Bình Hưng, Bình Chánh), KDC Camellia, Mizuki Park hoặc khu vực Tạ Quang Bửu (Quận 8) để bắt xe buýt tuyến 08, 102 tới thẳng trường."
      },
      {
        q: "Phòng trọ gần cơ sở A, B của UEH (Quận 3, Quận 10) giá thế nào?",
        a: "Vì nằm tại vùng lõi trung tâm, phòng trọ quanh cơ sở A/B thường có giá từ 4.0 - 6.5 triệu/tháng. Sinh viên thường chọn thuê tại khu hẻm Cách Mạng Tháng 8, Lê Văn Sỹ hoặc Trần Quang Diệu để tối ưu ngân sách."
      }
    ]
  },
  {
    id: "ton-duc-thang-tdtu",
    slug: "ton-duc-thang-tdtu",
    ten: "Đại học Tôn Đức Thắng (TDTU)",
    tenVietTat: "TDTU",
    diaChi: "19 Nguyễn Hữu Thọ, P. Tân Phong, Quận 7",
    quan: ["Quận 7", "Nhà Bè", "Quận 4"],
    phuong: ["Tân Phong", "Tân Quy", "Phước Kiển"],
    mucGiaTB: "3.5 - 5.5 triệu/tháng",
    khoangGia: { min: 3000000, max: 6000000 },
    khuVucThueTot: ["Lê Văn Lương", "Đường số Chợ Tân Quy", "Lâm Văn Bền", "Lê Văn Lương (Phước Kiển)"],
    moTa: "TDTU sở hữu khuôn viên hiện đại bậc nhất Quận 7. Lượng sinh viên thuê trọ tập trung đông đúc tại trục đường Lê Văn Lương (từ cầu Rạch Đĩa đến ngã tư Nguyễn Thị Thập), các đường số phường Tân Quy và khu vực Phước Kiển giáp ranh trường.",
    tuKhoa: ["tôn đức thắng", "tdtu", "quận 7", "nguyễn hữu thọ", "lê văn lương", "tân phong"],
    faq: [
      {
        q: "Thuê trọ gần Tôn Đức Thắng đường nào rẻ và gần nhất?",
        a: "Đường Lê Văn Lương (đoạn Phước Kiển - Nhà Bè qua cầu Rạch Đĩa 300m) hoặc các đường số Phường Tân Quy có nhiều dãy trọ sinh viên giá từ 2.8 - 4 triệu/tháng, chỉ mất 3-5 phút đi xe máy đến cổng trường."
      },
      {
        q: "Căn hộ dịch vụ studio cho sinh viên TDTU giá bao nhiêu?",
        a: "Các studio full nội thất (máy lạnh, tủ lạnh, bếp riêng, bảo vệ 24/7, thang máy) gần TDTU dao động từ 4.2 - 6.0 triệu/tháng."
      }
    ]
  },
  {
    id: "su-pham-ky-thuat-hcmute",
    slug: "su-pham-ky-thuat-hcmute",
    ten: "Đại học Sư phạm Kỹ thuật TP.HCM",
    tenVietTat: "HCMUTE",
    diaChi: "01 Võ Văn Ngân, P. Linh Chiểu, TP. Thủ Đức",
    quan: ["Thủ Đức"],
    phuong: ["Linh Chiểu", "Linh Trung", "Bình Thọ", "Trường Thọ"],
    mucGiaTB: "2.5 - 4.5 triệu/tháng",
    khoangGia: { min: 2200000, max: 5000000 },
    khuVucThueTot: ["Võ Văn Ngân", "Hoàng Diệu 2", "Đặng Văn Bi", "Lê Văn Chí", "Kha Vạn Cân"],
    moTa: "HCMUTE nằm ngay ngã tư Thủ Đức trên trục Võ Văn Ngân. Xung quanh trường là thiên đường ẩm thực sinh viên Hoàng Diệu 2, Đặng Văn Bi. Nguồn phòng trọ ở đây dồi dào, giá cả bình dân và gần trạm Metro số 1 Bến Thành - Suối Tiên.",
    tuKhoa: ["sư phạm kỹ thuật", "spkt", "hcmute", "thủ đức", "võ văn ngân", "hoàng diệu 2", "ngã tư thủ đức"],
    faq: [
      {
        q: "Sinh viên SPKT nên thuê trọ ở đường nào vừa vui vừa gần trường?",
        a: "Đường Hoàng Diệu 2 và các hẻm nhánh là điểm đến số 1 của sinh viên SPKT, cách trường 500m, tập trung vô số hàng quán, quán cafe tự học và siêu thị tiện lợi."
      },
      {
        q: "Trọ gần ngã tư Thủ Đức có tiện đi Metro không?",
        a: "Rất tiện! Ga Thủ Đức của tuyến Metro số 1 nằm sát cạnh cổng HCMUTE. Bạn có thể dễ dàng đi lại vào trung tâm Quận 1 chỉ mất 15-20 phút mà không lo kẹt xe."
      }
    ]
  },
  {
    id: "cong-nghiep-tphcm-iuh",
    slug: "cong-nghiep-tphcm-iuh",
    ten: "Đại học Công nghiệp TP.HCM (IUH)",
    tenVietTat: "IUH",
    diaChi: "12 Nguyễn Văn Bảo, P.4, Q. Gò Vấp",
    quan: ["Gò Vấp", "Bình Thạnh", "Phú Nhuận"],
    phuong: ["Phường 4", "Phường 5", "Phường 7"],
    mucGiaTB: "2.5 - 4.2 triệu/tháng",
    khoangGia: { min: 2300000, max: 4800000 },
    khuVucThueTot: ["Nguyễn Văn Bảo", "Lê Lợi", "Nguyễn Thái Sơn", "Phan Văn Trị", "Trần Bá Giao"],
    moTa: "IUH là trường có quy mô sinh viên đông bậc nhất Gò Vấp. Toàn bộ khu dân cư đường Nguyễn Văn Bảo, hẻm Lê Lợi, Nguyễn Thái Sơn được ví như 'thành phố thu nhỏ' chuyên phục vụ sinh viên với giá thuê rất mềm và chi phí sinh hoạt hợp lý.",
    tuKhoa: ["công nghiệp tphcm", "iuh", "gò vấp", "nguyễn văn bảo", "nguyễn thái sơn", "lê lợi"],
    faq: [
      {
        q: "Thuê trọ gần IUH có dễ tìm phòng không?",
        a: "Mật độ phòng trọ quanh IUH cực kỳ dày đặc. Tuy nhiên vào mùa nhập học (tháng 8 - 10), phòng đẹp giá dưới 3 triệu sẽ hết rất nhanh. Bạn nên tìm và cọc phòng trước 2-3 tuần."
      },
      {
        q: "Giá thuê phòng trọ gần Đại học Công nghiệp Gò Vấp là bao nhiêu?",
        a: "Phòng trọ sinh viên cơ bản (15-20m2, wc riêng) khoảng 2.3 - 3.2 triệu/tháng. Phòng mới xây có thang máy, máy lạnh khoảng 3.5 - 4.5 triệu/tháng."
      }
    ]
  },
  {
    id: "van-lang-vlu",
    slug: "van-lang-vlu",
    ten: "Đại học Văn Lang (VLU)",
    tenVietTat: "VLU",
    diaChi: "69/68 Đặng Thuỳ Trâm (Bình Thạnh) & 45 Nguyễn Khắc Nhu (Q.1)",
    quan: ["Bình Thạnh", "Gò Vấp", "Quận 1"],
    phuong: ["Phường 13", "Phường 5"],
    mucGiaTB: "3.5 - 6.0 triệu/tháng",
    khoangGia: { min: 3200000, max: 6500000 },
    khuVucThueTot: ["Đặng Thuỳ Trâm", "Phạm Văn Đồng", "Nguyễn Xí", "Bình Lợi", "Lê Quang Định"],
    moTa: "Văn Lang có Cơ sở chính (CS3) siêu hiện đại tại đường Đặng Thuỳ Trâm (Bình Thạnh), tiếp giáp đại lộ Phạm Văn Đồng. Sinh viên Văn Lang rất chuộng các căn hộ dịch vụ, chung cư mini phong cách hiện đại quanh trục Đặng Thuỳ Trâm và Bình Lợi.",
    tuKhoa: ["văn lang", "vlu", "đặng thuỳ trâm", "bình thạnh", "bình lợi", "phạm văn đồng"],
    faq: [
      {
        q: "Phòng trọ gần Cơ sở chính ĐH Văn Lang có đắt không?",
        a: "Phòng trọ quanh trục Đặng Thuỳ Trâm có nhiều phân khúc. Phòng trọ sinh viên từ 3.2 - 4 triệu/tháng; căn hộ dịch vụ cao cấp, studio duplex từ 4.5 - 6.5 triệu/tháng."
      },
      {
        q: "Khu vực Đặng Thuỳ Trâm, Bình Lợi có tiện ích gì cho sinh viên?",
        a: "Đây là khu đô thị ven sông quy hoạch khang trang, nhiều cây xanh, phòng gym, siêu thị tiện lợi Emart Phan Văn Trị cách đó 5 phút đi xe."
      }
    ]
  },
  {
    id: "khoa-hoc-tu-nhien-hcmus",
    slug: "khoa-hoc-tu-nhien-hcmus",
    ten: "Đại học Khoa học Tự nhiên ĐHQG-HCM",
    tenVietTat: "HCMUS",
    diaChi: "227 Nguyễn Văn Cừ, P.4, Quận 5 & Làng Đại học Thủ Đức",
    quan: ["Quận 5", "Quận 1", "Quận 10", "Thủ Đức"],
    phuong: ["Phường 4", "Đông Hòa"],
    mucGiaTB: "2.8 - 4.8 triệu/tháng",
    khoangGia: { min: 2500000, max: 5500000 },
    khuVucThueTot: ["Nguyễn Văn Cừ", "Trần Hưng Đạo", "An Dương Vương", "Làng Đại Học TP. Thủ Đức"],
    moTa: "Cơ sở 1 của KHTN nằm ngay giao lộ Nguyễn Văn Cừ - An Dương Vương, kết nối trực tiếp Quận 5, Quận 1 và Quận 10. Sinh viên năm 1-2 học nhiều tại Làng Đại Học Thủ Đức, trong khi năm 3-4 chuyển về cơ sở Nguyễn Văn Cừ.",
    tuKhoa: ["khoa học tự nhiên", "khtn", "hcmus", "quận 5", "nguyễn văn cừ", "an dương vương"],
    faq: [
      {
        q: "Sinh viên KHTN chuyển cơ sở giữa Thủ Đức và Q5 thuê trọ thế nào?",
        a: "Nếu đang học năm 2 chuẩn bị lên năm 3 chuyển về Q5, bạn nên bắt đầu tìm phòng tại Quận 5 hoặc Quận 8 (gần cầu chữ Y) từ tháng 6-7 để giữ được phòng giá tốt."
      }
    ]
  },
  {
    id: "y-duoc-tphcm-ump",
    slug: "y-duoc-tphcm-ump",
    ten: "Đại học Y Dược TP.HCM",
    tenVietTat: "UMP",
    diaChi: "217 Hồng Bàng, P.11, Quận 5",
    quan: ["Quận 5", "Quận 10", "Quận 11", "Quận 6"],
    phuong: ["Phường 11", "Phường 12"],
    mucGiaTB: "3.5 - 5.5 triệu/tháng",
    khoangGia: { min: 3000000, max: 6000000 },
    khuVucThueTot: ["Hồng Bàng", "Nguyễn Chí Thanh", "Ngô Quyền", "Lý Thường Kiệt", "Hùng Vương"],
    moTa: "Đại học Y Dược TP.HCM nằm tại trung tâm Chợ Lớn. Sinh viên Y thường phải đi lâm sàng tại các bệnh viện lớn (Chợ Rẫy, ĐH Y Dược, Hùng Vương, Nhi Đồng 1), nên thường thuê phòng trong bán kính 1-2km quanh trục Hồng Bàng và Nguyễn Chí Thanh.",
    tuKhoa: ["y dược tphcm", "ump", "hồng bàng", "quận 5", "chợ rẫy", "nguyễn chí thanh"],
    faq: [
      {
        q: "Sinh viên Y Dược nên thuê trọ ở khu nào để tiện trực đêm?",
        a: "Khu vực các hẻm đường Ngô Quyền, Tân Hưng, Nguyễn Chí Thanh cách bệnh viện Chợ Rẫy và ĐH Y Dược dưới 500m, đường sá sáng sủa và an ninh rất tốt cho các bạn đi trực đêm."
      }
    ]
  },
  {
    id: "ngoai-thuong-cs2-ftu",
    slug: "ngoai-thuong-cs2-ftu",
    ten: "Đại học Ngoại thương Cơ sở 2",
    tenVietTat: "FTU2",
    diaChi: "Số 15, Đường D5, P.25, Q. Bình Thạnh",
    quan: ["Bình Thạnh"],
    phuong: ["Phường 25"],
    mucGiaTB: "3.8 - 6.0 triệu/tháng",
    khoangGia: { min: 3500000, max: 6500000 },
    khuVucThueTot: ["Đường D5", "Đường D2 (Nguyễn Gia Trí)", "Bạch Đằng", "Điện Biên Phủ"],
    moTa: "Ngoại thương CS2 nằm ngay trung tâm 'làng đại học thu nhỏ' của Bình Thạnh (gồm FTU, HUTECH, GTVT, UEF). Nhu cầu thuê phòng trọ và căn hộ mini tại đường D5 cực cao, phòng ốc mới và đa dạng tiện nghi.",
    tuKhoa: ["ngoại thương", "ftu", "ftu2", "đường d5", "bình thạnh", "phường 25"],
    faq: [
      {
        q: "Giá phòng trọ tại đường D5 gần FTU2 khoảng bao nhiêu?",
        a: "Đường D5 tập trung nhiều phòng trọ dạng căn hộ mini, studio ban công với giá từ 4.0 - 6.0 triệu/tháng. Nếu đi sâu vào các hẻm nhánh đường Xô Viết Nghệ Tĩnh sẽ có phòng từ 3.2 - 3.8 triệu/tháng."
      }
    ]
  },
  {
    id: "kinh-te-tai-chinh-uef",
    slug: "kinh-te-tai-chinh-uef",
    ten: "Đại học Kinh tế - Tài chính TP.HCM (UEF)",
    tenVietTat: "UEF",
    diaChi: "141-145 Điện Biên Phủ, P.15, Q. Bình Thạnh",
    quan: ["Bình Thạnh", "Quận 1"],
    phuong: ["Phường 15", "Phường 21", "Phường 25"],
    mucGiaTB: "3.5 - 5.5 triệu/tháng",
    khoangGia: { min: 3200000, max: 6000000 },
    khuVucThueTot: ["Điện Biên Phủ", "Phan Văn Hân", "Huỳnh Mẫn Đạt", "Nguyễn Cửu Vân"],
    moTa: "UEF nằm ngay cửa ngõ Quận 1 - Bình Thạnh tại ngã tư Hàng Xanh. Vị trí này siêu đắc địa, thuận tiện di chuyển sang Quận 1, Quận 2, Quận 3. Khu vực Phan Văn Hân, Huỳnh Mẫn Đạt có nhiều phòng trọ cao cấp, yên tĩnh.",
    tuKhoa: ["uef", "kinh tế tài chính", "điện biên phủ", "hàng xanh", "bình thạnh"],
    faq: [
      {
        q: "Thuê trọ gần UEF Hàng Xanh sang Quận 1 mất bao lâu?",
        a: "Từ khu vực Hàng Xanh sang Quận 1 (qua cầu Điện Biên Phủ hoặc cầu Thị Nghè) chỉ mất 3-5 phút đi xe, rất tiện lợi cho các bạn vừa học vừa làm thêm tại trung tâm."
      }
    ]
  },
  {
    id: "nong-lam-tphcm-nlu",
    slug: "nong-lam-tphcm-nlu",
    ten: "Đại học Nông Lâm TP.HCM",
    tenVietTat: "NLU",
    diaChi: "Khu phố 6, P. Linh Trung, TP. Thủ Đức",
    quan: ["Thủ Đức"],
    phuong: ["Linh Trung", "Đông Hòa"],
    mucGiaTB: "2.0 - 3.5 triệu/tháng",
    khoangGia: { min: 1800000, max: 4000000 },
    khuVucThueTot: ["Quốc lộ 1A", "Đường số 17", "Khu Làng Đại Học", "KDC Đại học Nông Lâm"],
    moTa: "Nông Lâm có khuôn viên sinh thái rộng lớn tại cửa ngõ Đông Bắc thành phố. Giá phòng trọ tại đây thuộc diện rẻ nhất TP.HCM, không gian thoáng đãng, nhiều cây xanh.",
    tuKhoa: ["nông lâm", "nlu", "thủ đức", "linh trung", "quốc lộ 1a"],
    faq: [
      {
        q: "Giá thuê trọ sinh viên ĐH Nông Lâm TP.HCM thế nào?",
        a: "Giá thuê phòng trọ quanh Nông Lâm rất hạt dẻ, chỉ từ 1.8 - 2.8 triệu/tháng cho phòng có gác lửng, vệ sinh riêng. Phòng cao cấp hơn có máy lạnh giá từ 3.0 - 3.8 triệu/tháng."
      }
    ]
  },
  {
    id: "fpt-tphcm",
    slug: "fpt-tphcm",
    ten: "Đại học FPT TP.HCM",
    tenVietTat: "FPTU",
    diaChi: "Đường D1, Khu Công nghệ cao, P. Long Thạnh Mỹ, TP. Thủ Đức",
    quan: ["Thủ Đức"],
    phuong: ["Long Thạnh Mỹ", "Tăng Nhơn Phú A"],
    mucGiaTB: "2.5 - 4.5 triệu/tháng",
    khoangGia: { min: 2300000, max: 5000000 },
    khuVucThueTot: ["Man Thiện", "Lê Văn Việt", "Vinhomes Grand Park", "Đường 449"],
    moTa: "FPT nằm trong lòng Khu Công nghệ cao TP.HCM. Sinh viên FPT thường chọn thuê phòng tại chung cư Vinhomes Grand Park (thuê nguyên căn share phòng) hoặc các dãy trọ cao cấp đường Man Thiện.",
    tuKhoa: ["fpt", "fptu", "khu công nghệ cao", "thủ đức", "vinhomes grand park", "man thiện"],
    faq: [
      {
        q: "Sinh viên FPT nên thuê trọ ở Vinhomes Grand Park hay ở ngoài?",
        a: "Nếu thích không gian sống hiện đại, an ninh, tiện ích hồ bơi, xe bus VinBus miễn phí vào trường thì thuê căn hộ Vinhomes Grand Park share phòng (khoảng 2.0 - 2.8 triệu/người) là lựa chọn hàng đầu của sinh viên FPT."
      }
    ]
  },
  {
    id: "quoc-te-hong-bang-hiu",
    slug: "quoc-te-hong-bang-hiu",
    ten: "Đại học Quốc tế Hồng Bàng",
    tenVietTat: "HIU",
    diaChi: "215 Điện Biên Phủ, P.15, Q. Bình Thạnh & 120 Hòa Bình, Q. Tân Phú",
    quan: ["Bình Thạnh", "Tân Phú"],
    phuong: ["Phường 15", "Hòa Thạnh"],
    mucGiaTB: "3.5 - 5.5 triệu/tháng",
    khoangGia: { min: 3200000, max: 6000000 },
    khuVucThueTot: ["Điện Biên Phủ", "Bạch Đằng", "Đinh Bộ Lĩnh", "Khu Hàng Xanh"],
    moTa: "Tòa nhà 'Con tàu tri thức' HIU tọa lạc tại mặt tiền đường Điện Biên Phủ gần Hàng Xanh. Vị trí trung tâm Bình Thạnh giúp sinh viên HIU dễ dàng thuê phòng ở các khu lân cận như Đinh Bộ Lĩnh, Bạch Đằng.",
    tuKhoa: ["hồng bàng", "hiu", "điện biên phủ", "bình thạnh", "hàng xanh"],
    faq: [
      {
        q: "Phòng trọ gần HIU Bình Thạnh có an ninh không?",
        a: "Khu vực quanh HIU thuộc phường 15 Bình Thạnh, dân cư văn minh, hẻm có camera an ninh và rất gần các chốt công an phường nên an ninh rất đảm bảo."
      }
    ]
  },
  {
    id: "su-pham-tphcm-hcmue",
    slug: "su-pham-tphcm-hcmue",
    ten: "Đại học Sư phạm TP.HCM",
    tenVietTat: "HCMUE",
    diaChi: "280 An Dương Vương, P.4, Quận 5 & 222 Lê Văn Sỹ, P.14, Quận 3",
    quan: ["Quận 5", "Quận 3", "Quận 10"],
    phuong: ["Phường 4", "Phường 14"],
    mucGiaTB: "3.0 - 5.0 triệu/tháng",
    khoangGia: { min: 2800000, max: 5500000 },
    khuVucThueTot: ["An Dương Vương", "Trần Phú", "Nguyễn Trãi", "Lê Văn Sỹ", "Trần Quang Diệu"],
    moTa: "ĐH Sư phạm TP.HCM có cơ sở chính tại An Dương Vương (Quận 5) liền kề ĐH Sài Gòn và ĐH Khoa học Tự nhiên; cùng cơ sở Lê Văn Sỹ (Quận 3). Sinh viên HCMUE có rất nhiều lựa chọn phòng trọ trung tâm.",
    tuKhoa: ["sư phạm tphcm", "hcmue", "an dương vương", "quận 5", "lê văn sỹ"],
    faq: [
      {
        q: "Khu vực gần ĐH Sư phạm An Dương Vương có trọ rẻ cho sinh viên không?",
        a: "Bạn có thể tìm các phòng trọ trong hẻm đường Trần Phú, Nguyễn Trãi hoặc đi qua cầu chữ Y sang bờ Quận 8 (Dương Bá Trạc) để tìm phòng trọ giá 2.5 - 3.5 triệu/tháng, chỉ cách trường 5-10 phút đi xe."
      }
    ]
  }
];

export function getDaiHocBySlug(slug: string): TruongDaiHoc | undefined {
  return DANH_SACH_DAI_HOC.find((u) => u.slug === slug);
}
