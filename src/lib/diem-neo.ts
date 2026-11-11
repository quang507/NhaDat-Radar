// Danh sách điểm neo chiến lược phục vụ Programmatic SEO (pSEO)
// Mỗi điểm neo có toạ độ thực, bán kính và nội dung mô tả đặc thù khu vực (không văn mẫu)
// Chặn rủi ro cannibalization bằng cách chỉ chọn các điểm neo độc lập, độ trùng lặp < 50%

export type NhomDiemNeo = "van-phong" | "giao-thong" | "benh-vien" | "ga-metro" | "khu-cong-nghiep";

export interface DiemNeo {
  slug: string;
  ten: string;
  nhom: NhomDiemNeo;
  tenNhom: string;
  quanChinh: string;
  lat: number;
  lng: number;
  banKinhKm: number;
  moTa: string;
  loiThe: string[];
}

export const DIEM_NEO: DiemNeo[] = [
  {
    slug: "etown-cong-hoa",
    ten: "Etown Cộng Hoà",
    nhom: "van-phong",
    tenNhom: "Khu phức hợp văn phòng",
    quanChinh: "Quận Tân Bình",
    lat: 10.8015,
    lng: 106.6427,
    banKinhKm: 2.0,
    moTa: "Khu phức hợp văn phòng lớn nhất quận Tân Bình với hàng chục nghìn nhân sự công nghệ, ngân hàng và tài chính. Xung quanh tập trung nhiều căn hộ mini, studio dịch vụ full nội thất và phòng có gác lửng trên các trục đường Cộng Hòa, Hoàng Hoa Thám, Nguyễn Thái Bình, rất thuận tiện đi lại và sinh hoạt.",
    loiThe: [
      "Đi bộ hoặc đi xe máy dưới 5 phút tới nơi làm việc",
      "Gần Vincom Plaza Cộng Hòa, Lotte Mart Tân Bình",
      "Tuyến xe buýt dày đặc trên trục Cộng Hòa - Trường Chinh",
      "Nhiều quán ăn, cà phê làm việc và tiện ích 24/7",
    ],
  },
  {
    slug: "san-bay-tan-son-nhat",
    ten: "Sân bay Tân Sơn Nhất",
    nhom: "giao-thong",
    tenNhom: "Cảng hàng không",
    quanChinh: "Quận Tân Bình",
    lat: 10.8185,
    lng: 106.6588,
    banKinhKm: 2.0,
    moTa: "Khu vực tập trung đông đảo tiếp viên hàng không, phi công và nhân sự cảng hàng không. Nhu cầu thuê phòng cao tại các tuyến đường Bạch Đằng, Yên Thế, Hồng Hà, Cửu Long, Trường Sơn với tiêu chuẩn giờ giấc tự do, an ninh nghiêm ngặt và đầy đủ nội thất cao cấp.",
    loiThe: [
      "Chỉ 5 - 10 phút di chuyển vào thẳng các nhà ga T1, T2, T3",
      "Giờ giấc tự do 24/7, phù hợp ca bay đêm và sáng sớm",
      "Khu phố an ninh văn minh, nhiều cư dân ngành hàng không",
      "Gần công viên Gia Định, công viên Hoàng Văn Thụ",
    ],
  },
  {
    slug: "benh-vien-ung-buou",
    ten: "Bệnh viện Ung Bướu (Bình Thạnh)",
    nhom: "benh-vien",
    tenNhom: "Bệnh viện & Trung tâm y tế",
    quanChinh: "Quận Bình Thạnh",
    lat: 10.8035,
    lng: 106.6975,
    banKinhKm: 2.0,
    moTa: "Tọa lạc tại trung tâm Bình Thạnh giáp ranh Phú Nhuận. Khu vực tập trung nhiều y bác sĩ, điều dưỡng, sinh viên thực tập y khoa và người chăm sóc bệnh nhân. Các trục đường thuê phổ biến gồm Nơ Trang Long, Phan Đăng Lưu, Hoàng Hoa Thám, Lê Quang Định với mức giá đa dạng.",
    loiThe: [
      "Kết nối nhanh chóng tới BV Ung Bướu, BV Nhân Dân Gia Định",
      "Tiếp giáp Quận 1 và Phú Nhuận chỉ trong 5-10 phút",
      "Đa dạng phân khúc từ phòng trọ giá rẻ đến studio cao cấp",
      "Gần chợ Bà Chiểu, đầy đủ chợ dân sinh và siêu thị tiện lợi",
    ],
  },
  {
    slug: "benh-vien-cho-ray",
    ten: "Bệnh viện Chợ Rẫy",
    nhom: "benh-vien",
    tenNhom: "Bệnh viện & Tuyến y tế",
    quanChinh: "Quận 5",
    lat: 10.7582,
    lng: 106.6596,
    banKinhKm: 2.0,
    moTa: "Trục y tế trọng điểm tại điểm giao Quận 5 - Quận 10 - Quận 11. Khu vực có hạ tầng giao thông kết nối hoàn chỉnh, nhiều phòng trọ an ninh, sạch sẽ dọc các trục đường Nguyễn Chí Thanh, Thuận Kiều, Hồng Bàng, Lý Thường Kiệt.",
    loiThe: [
      "Đi bộ hoặc đi xe máy nhanh tới BV Chợ Rẫy, BV Hùng Vương, BV Răng Hàm Mặt",
      "Gần các trường Đại học Y Dược TP.HCM, ĐH Y khoa Phạm Ngọc Thạch",
      "Hệ thống xe buýt công cộng phong phú đi khắp các quận",
      "Khu ẩm thực Chợ Lớn sầm uất, chi phí ăn uống hợp lý",
    ],
  },
  {
    slug: "ga-metro-van-thanh",
    ten: "Ga Metro Văn Thánh",
    nhom: "ga-metro",
    tenNhom: "Tuyến Metro số 1",
    quanChinh: "Quận Bình Thạnh",
    lat: 10.7951,
    lng: 106.7151,
    banKinhKm: 1.5,
    moTa: "Điểm kết nối giao thông huyết mạch của tuyến Metro số 1 Bến Thành - Suối Tiên, chỉ mất 5 phút vào trung tâm Quận 1. Rất phù hợp cho nhân viên văn phòng và sinh viên các trường HUTECH, UEF, Ngoại Thương thuê trọ dọc đường Điện Biên Phủ, D1, D2 (Nguyễn Gia Trí).",
    loiThe: [
      "Đi tàu Metro vào Quận 1 chỉ mất 5 phút, không lo kẹt xe",
      "Trung tâm sinh viên sầm uất bậc nhất Sài Gòn (khu D2 Nguyễn Gia Trí)",
      "Gần Landmark 81 và công viên bờ sông Văn Thánh",
      "Nhiều căn hộ dịch vụ cao cấp, view Landmark thoáng đãng",
    ],
  },
  {
    slug: "khu-che-xuat-tan-thuan",
    ten: "Khu chế xuất Tân Thuận",
    nhom: "khu-cong-nghiep",
    tenNhom: "Khu chế xuất & Công nghiệp",
    quanChinh: "Quận 7",
    lat: 10.7635,
    lng: 106.7328,
    banKinhKm: 2.0,
    moTa: "Khu chế xuất lớn đầu tiên của TP.HCM, giáp Quận 4 và khu đô thị Phú Mỹ Hưng. Nguồn cung phòng trọ dồi dào, giá hợp lý cho kỹ sư, chuyên gia và công nhân làm việc tại KCX dọc đường Huỳnh Tấn Phát, Trần Trọng Khiêm, Lâm Văn Bền.",
    loiThe: [
      "Đi làm ngay sát nhà, tránh ngập nước và kẹt xe giờ cao điểm",
      "Qua Quận 4 và Quận 1 chỉ 10 phút qua cầu Tân Thuận",
      "Hưởng trọn tiện ích của khu đô thị Nam Sài Gòn và Phú Mỹ Hưng",
      "Mức giá thuê rất cạnh tranh so với các quận trung tâm",
    ],
  },
  {
    slug: "ga-metro-thao-dien",
    ten: "Ga Metro Thảo Điền",
    nhom: "ga-metro",
    tenNhom: "Tuyến Metro số 1",
    quanChinh: "TP. Thủ Đức",
    lat: 10.8027,
    lng: 106.7359,
    banKinhKm: 1.5,
    moTa: "Điểm dừng cửa ngõ khu Thảo Điền dọc Xa lộ Hà Nội, tập trung nhiều căn hộ studio và phòng dịch vụ tiện nghi trên trục Quốc Hương, Xuân Thủy, Nguyễn Văn Hưởng. Phù hợp chuyên gia, nhân viên văn phòng làm việc tại Thảo Điền và Quận 1.",
    loiThe: [
      "Đi bộ ra ga Metro Thảo Điền, vào Bến Thành khoảng 10 phút",
      "Khu dân cư yên tĩnh nhiều cây xanh, sát bờ sông Sài Gòn",
      "Gần Vincom Mega Mall Thảo Điền và siêu thị An Phú",
      "Nhiều lựa chọn studio full nội thất, có ban công thoáng",
    ],
  },
  {
    slug: "ga-metro-thu-duc",
    ten: "Ga Metro Thủ Đức",
    nhom: "ga-metro",
    tenNhom: "Tuyến Metro số 1",
    quanChinh: "TP. Thủ Đức",
    lat: 10.8461,
    lng: 106.7717,
    banKinhKm: 2.0,
    moTa: "Nằm ngay giao lộ Võ Nguyên Giáp và Lê Văn Việt, thuận tiện cho sinh viên Sư phạm Kỹ thuật, Ngân hàng và người đi làm khu vực trung tâm Thủ Đức. Nguồn phòng phân khúc 2,5 - 5 triệu rất dồi dào quanh đường Đặng Văn Bi, Hoàng Diệu 2.",
    loiThe: [
      "Sát ĐH Sư phạm Kỹ thuật TP.HCM và trục Hoàng Diệu 2",
      "Mức giá thuê mềm hơn nội thành, nhiều phòng mới có gác",
      "Lên Metro di chuyển thẳng vào Quận 1 không lo kẹt Xa lộ Hà Nội",
      "Gần Vincom Thủ Đức, chợ Thủ Đức và nhiều khu ăn uống sinh viên",
    ],
  },
  {
    slug: "ga-metro-ben-thanh",
    ten: "Ga Metro Bến Thành",
    nhom: "ga-metro",
    tenNhom: "Tuyến Metro số 1",
    quanChinh: "Quận 1",
    lat: 10.7716,
    lng: 106.6981,
    banKinhKm: 1.5,
    moTa: "Ga trung tâm nối liền các tuyến giao thông và cụm cao ốc văn phòng lõi Quận 1. Các hẻm trung tâm quanh Phạm Ngũ Lão, Trần Hưng Đạo, Nguyễn Trãi, Calmette có nhiều phòng dịch vụ gọn gàng giúp tiết kiệm tối đa thời gian đi làm.",
    loiThe: [
      "Đi bộ tới chợ Bến Thành, phố đi bộ Nguyễn Huệ và cụm cao ốc Quận 1",
      "Không tốn chi phí gửi xe hoặc di chuyển giờ cao điểm",
      "Tiện ích ăn uống, mua sắm và tuyến xe buýt tỏa đi mọi quận",
      "Phù hợp nhân sự văn phòng trung tâm thích nhịp sống năng động",
    ],
  },
  {
    slug: "ga-metro-ba-son",
    ten: "Ga Metro Ba Son",
    nhom: "ga-metro",
    tenNhom: "Tuyến Metro số 1",
    quanChinh: "Quận 1",
    lat: 10.7817,
    lng: 106.7082,
    banKinhKm: 1.5,
    moTa: "Khu vực giao thoa giữa Tôn Đức Thắng, Nguyễn Hữu Cảnh và cầu Thủ Thiêm 2. Tập trung nhiều căn hộ mini và phòng cho thuê cao cấp dọc Ngô Tất Tố, Nguyễn Bỉnh Khiêm, Đinh Tiên Hoàng phục vụ giới văn phòng khu trung tâm và Thủ Thiêm.",
    loiThe: [
      "Qua cầu Ba Son tới khu đô thị Thủ Thiêm chỉ mất 3 phút",
      "Sát công viên Bến Bạch Đằng và trục văn phòng Lê Duẩn",
      "Nhiều phòng có cửa sổ sáng, nội thất sẵn và bảo vệ an ninh",
      "Dễ dàng di chuyển sang Bình Thạnh qua trục Nguyễn Hữu Cảnh",
    ],
  },
  {
    slug: "benh-vien-thong-nhat",
    ten: "Bệnh viện Thống Nhất",
    nhom: "benh-vien",
    tenNhom: "Bệnh viện & Tuyến y tế",
    quanChinh: "Quận Tân Bình",
    lat: 10.7915,
    lng: 106.6531,
    banKinhKm: 1.5,
    moTa: "Nằm ngay ngã tư Bảy Hiền giao giữa Lý Thường Kiệt và Hoàng Văn Thụ, lượng phòng trọ phong phú trải dài sang Tân Bình và Quận 11. Khu vực sầm uất, dễ tìm phòng giá vừa tầm trên các tuyến Lạc Long Quân, Bành Văn Trân, Cách Mạng Tháng 8.",
    loiThe: [
      "Ngay nút giao Bảy Hiền đi Quận 10, Quận 3, Tân Phú rất gần",
      "Nhiều dãy phòng sạch sẽ trong hẻm an ninh yên tĩnh",
      "Gần chợ Tân Bình, công viên Lê Thị Riêng và BV Hoàn Mỹ",
      "Giá thuê đa dạng từ bình dân đến căn hộ mini có thang máy",
    ],
  },
  {
    slug: "khu-cong-nghiep-tan-binh",
    ten: "Khu công nghiệp Tân Bình",
    nhom: "khu-cong-nghiep",
    tenNhom: "Khu chế xuất & Công nghiệp",
    quanChinh: "Quận Tân Bình",
    lat: 10.8172,
    lng: 106.6177,
    banKinhKm: 2.0,
    moTa: "Trải dài dọc trục Trường Chinh và Tây Thạnh, giáp ranh giữa Tân Phú, Tân Bình và Bình Tân. Tập trung hàng trăm nhà trọ bình dân, phòng có gác lửng mức giá dễ chịu trên đường Tây Thạnh, Lê Trọng Tấn, Phạm Đăng Giảng.",
    loiThe: [
      "Mức thuê phải chăng, nhiều phòng dưới 3,5 triệu có gác lửng",
      "Sát AEON Mall Tân Phú, Pandora City và trục Trường Chinh",
      "Đi bộ hoặc chạy xe vài phút tới các nhà máy trong KCN",
      "Thuận tiện kết nối sân bay Tân Sơn Nhất và Bến xe An Sương",
    ],
  },
  {
    slug: "cong-vien-phan-mem-quang-trung",
    ten: "Công viên phần mềm Quang Trung",
    nhom: "van-phong",
    tenNhom: "Khu phức hợp văn phòng",
    quanChinh: "Quận 12",
    lat: 10.8541,
    lng: 106.6263,
    banKinhKm: 2.0,
    moTa: "Trung tâm công nghệ thông tin lớn phía Tây Bắc TP.HCM trên đường Tô Ký. Xung quanh thuộc khu vực Tân Chánh Hiệp và Gò Vấp có nguồn cung phòng trọ mới xây rất nhiều với chi phí sinh hoạt thấp hơn hẳn nội thành.",
    loiThe: [
      "Gần nơi làm việc của hàng chục nghìn kỹ sư phần mềm, sinh viên CNTT",
      "Chi phí thuê phòng và ăn uống thấp hơn khu trung tâm từ 30-40%",
      "Nhiều khu nhà trọ mới có hầm xe, thang máy và khóa vân tay",
      "Kết nối nhanh sang Gò Vấp theo trục Quang Trung - Nguyễn Oanh",
    ],
  },
  {
    slug: "khu-cong-nghe-cao",
    ten: "Khu Công nghệ cao TP.HCM",
    nhom: "khu-cong-nghiep",
    tenNhom: "Khu chế xuất & Công nghiệp",
    quanChinh: "TP. Thủ Đức",
    lat: 10.8414,
    lng: 106.7875,
    banKinhKm: 2.0,
    moTa: "Tập trung nhiều tập đoàn công nghệ lớn, trường ĐH FPT, HUTECH khu E và Nguyễn Tất Thành cơ sở Q9. Các khu dân cư Lã Xuân Oai, Lê Văn Việt, Man Thiện có nhiều phòng trọ thoáng và khu ở ghép cho kỹ sư, sinh viên.",
    loiThe: [
      "Ngay sát cổng KCN cao và cụm trường đại học khu Đông",
      "Đường rộng, nhiều phòng mới thoáng mát có chỗ để xe hơi/xe máy",
      "Gần ga Metro Khu Công nghệ cao và bến xe Miền Đông mới",
      "Giá thuê hợp lý, nhiều lựa chọn ở 1-3 người",
    ],
  },
  {
    slug: "phu-my-hung",
    ten: "Khu đô thị Phú Mỹ Hưng",
    nhom: "van-phong",
    tenNhom: "Khu phức hợp văn phòng",
    quanChinh: "Quận 7",
    lat: 10.7294,
    lng: 106.7219,
    banKinhKm: 2.0,
    moTa: "Trung tâm tài chính, thương mại phía Nam Sài Gòn dọc đại lộ Nguyễn Văn Linh và Nguyễn Lương Bằng. Khu vực xung quanh đường Lâm Văn Bền, Mai Văn Vĩnh, Phạm Hữu Lầu có nhiều căn hộ dịch vụ và phòng studio cao cấp, sạch đẹp.",
    loiThe: [
      "Hạ tầng đồng bộ, đường xá thông thoáng, nhiều công viên cây xanh",
      "Gần Crescent Mall, SC VivoCity, ĐH RMIT và Tôn Đức Thắng",
      "An ninh khu vực cao, nhiều căn hộ mini full nội thất chuẩn",
      "Phù hợp nhân sự văn phòng Nam Sài Gòn và chuyên gia nước ngoài",
    ],
  },
  {
    slug: "benh-vien-nhi-dong-1",
    ten: "Bệnh viện Nhi Đồng 1",
    nhom: "benh-vien",
    tenNhom: "Bệnh viện & Tuyến y tế",
    quanChinh: "Quận 10",
    lat: 10.7689,
    lng: 106.6703,
    banKinhKm: 1.5,
    moTa: "Nằm trên trục Lý Thái Tổ - Sư Vạn Hạnh trung tâm Quận 10, kề cận Quận 3 và Quận 5. Xung quanh các tuyến Bà Hạt, Ngô Gia Tự, Sư Vạn Hạnh có mật độ phòng trọ và căn hộ mini cho thuê rất cao nhờ vị trí đi đâu cũng gần.",
    loiThe: [
      "Vị trí trung tâm Quận 10, đi Quận 1, Quận 3, Quận 5 trong 5-10 phút",
      "Sát Vạn Hạnh Mall, ĐH Kinh tế UEH cơ sở B và ĐH Bách Khoa",
      "Khu phố sầm uất, tiện ích y tế, siêu thị, ăn uống cả ngày",
      "Nhiều phòng khép kín sạch sẽ trong hẻm an ninh Quận 10",
    ],
  },
];

export function timDiemNeo(slug: string): DiemNeo | undefined {
  return DIEM_NEO.find((d) => d.slug === slug);
}

/**
 * Công thức Haversine tính khoảng cách theo km giữa 2 toạ độ GPS
 */
export function kmGiua(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const toRad = (v: number) => (v * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(6371 * c * 10) / 10; // làm tròn 1 chữ số thập phân (vd: 0.8 km)
}
