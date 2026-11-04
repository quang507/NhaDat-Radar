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
