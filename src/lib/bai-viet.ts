// BÀI HƯỚNG DẪN CỐ ĐỊNH ở /tin-tuc (3/10, SEO). Viết cho người đi thuê phòng ở TP.HCM - câu hỏi hay gặp nhất
// khi tìm trọ. Nội dung chung, không hứa hẹn pháp lý; số liệu giá cụ thể nằm ở báo cáo giá theo quận (bao-cao-gia).
export type MucBai = { h2: string; doan?: string[]; ds?: string[] };
export type BaiViet = { slug: string; tieuDe: string; moTa: string; ngay: string; muc: MucBai[] };

export const BAI_VIET: BaiViet[] = [
  {
    slug: "kinh-nghiem-thue-phong-tro-tphcm-tranh-mat-coc",
    tieuDe: "Kinh nghiệm thuê phòng trọ TP.HCM: 9 điều cần biết để không mất cọc",
    moTa: "Những bước kiểm tra trước khi đặt cọc phòng trọ ở TP.HCM: xem phòng thật, hỏi đủ chi phí, đọc hợp đồng, nhận biết tin ảo và chiêu lừa cọc thường gặp.",
    ngay: "2026-10-03",
    muc: [
      { h2: "1. Luôn đi xem phòng tận nơi trước khi chuyển tiền", doan: [
        "Chiêu lừa phổ biến nhất là đăng ảnh phòng đẹp, giá rẻ hơn mặt bằng rồi đòi chuyển khoản \"giữ chỗ\" vì \"nhiều người hỏi\". Không chuyển bất kỳ khoản nào trước khi bạn đứng trong căn phòng đó và gặp người có quyền cho thuê.",
      ] },
      { h2: "2. So giá với mặt bằng khu vực", doan: [
        "Phòng rẻ hơn hẳn các phòng cùng diện tích trong cùng phường là dấu hiệu cần hỏi kỹ: phòng ẩm, kẹt hẻm sâu, chủ sắp bán nhà, hoặc tin ảo. Xem giá trung vị theo từng quận ở mục báo cáo giá của NhaDat Radar để biết mức hợp lý.",
      ] },
      { h2: "3. Hỏi đủ mọi khoản phải trả mỗi tháng", ds: [
        "Giá điện (theo giá nhà nước hay 3.500 - 4.000đ/kWh), nước (theo khối hay theo người)",
        "Phí dịch vụ/quản lý, wifi, rác, gửi xe (xe thứ hai có tính thêm không)",
        "Phí giặt sấy, thang máy, phí khi có người ở thêm",
        "Tiền cọc mấy tháng và điều kiện hoàn cọc",
      ] },
      { h2: "4. Kiểm tra phòng như người sắp ở 1 năm", ds: [
        "Mở thử vòi nước, vòi sen nóng lạnh, máy lạnh; xem vết ố trần và chân tường (dấu hiệu thấm)",
        "Ổ khoá, cửa sổ, lối thoát hiểm, bình chữa cháy; khoá vân tay hay chìa",
        "Sóng điện thoại trong phòng, tiếng ồn giờ cao điểm, mùi cống",
        "Giờ giấc ra vào, có chung chủ không, có cho nuôi thú cưng không",
      ] },
      { h2: "5. Đọc hợp đồng trước khi ký", doan: [
        "Hợp đồng cần ghi rõ: giá thuê và thời hạn, số tiền cọc, các khoản phí, điều kiện tăng giá, điều kiện chấm dứt sớm và cách hoàn cọc. Chụp lại tình trạng phòng (ảnh có ngày giờ) lúc nhận phòng để tránh tranh chấp khi trả.",
      ] },
      { h2: "6. Cọc ít nhất có thể, chuyển khoản có ghi nội dung", doan: [
        "Thông thường cọc 1 tháng. Chuyển khoản với nội dung rõ \"Cọc phòng số ... địa chỉ ...\" và yêu cầu giấy nhận cọc có chữ ký - đây là bằng chứng nếu có tranh chấp.",
      ] },
      { h2: "7. Nhận biết tin ảo", ds: [
        "Ảnh quá đẹp, giống ảnh mẫu khách sạn; cùng ảnh nhưng đăng ở nhiều quận khác nhau",
        "Giá rẻ bất thường, người đăng né gọi video hoặc né cho xem phòng",
        "Đòi cọc online ngay với lý do \"đang có người hỏi\"",
      ] },
      { h2: "8. Đi xem vào giờ bạn sẽ thực sự ở", doan: [
        "Xem buổi tối để biết an ninh, đèn hẻm, tiếng ồn quán nhậu; xem giờ tan tầm để biết đường đi làm có kẹt không.",
      ] },
      { h2: "9. Tìm phòng ở nơi có phòng đã xác thực", doan: [
        "Trên NhaDat Radar, phòng gắn nhãn \"Rổ hàng Radar\" là phòng trống đã được xác thực, có mã phòng riêng; bạn hẹn xem miễn phí và được hỗ trợ thương lượng trực tiếp với chủ nhà.",
      ] },
    ],
  },
  {
    slug: "checklist-xem-phong-tro",
    tieuDe: "Checklist xem phòng trọ: 20 thứ cần kiểm tra trong 15 phút",
    moTa: "Danh sách kiểm tra khi đi xem phòng trọ, căn hộ dịch vụ: điện nước, thấm dột, an ninh, chi phí ẩn và câu hỏi nên hỏi chủ nhà.",
    ngay: "2026-10-03",
    muc: [
      { h2: "Trong phòng", ds: [
        "Diện tích thật (đo bước chân), trần cao, gác có đứng thẳng được không",
        "Máy lạnh: bật thử 5 phút, có chảy nước không; năm sản xuất",
        "Bình nóng lạnh, áp lực nước vòi sen, thoát nước sàn nhà tắm",
        "Vết ố, mốc ở trần và góc tường; mùi ẩm",
        "Cửa sổ thật (thông gió) hay cửa sổ ra hành lang",
        "Số ổ cắm, vị trí đặt bếp, kệ bếp, chậu rửa",
      ] },
      { h2: "Toà nhà và khu vực", ds: [
        "Khoá cổng vân tay/thẻ, camera, bảo vệ",
        "Chỗ để xe: có mái che không, giới hạn số xe, phí xe thứ hai",
        "Thang máy (nếu tầng cao), lối thoát hiểm, bình chữa cháy",
        "Hẻm rộng bao nhiêu, xe hơi vào được không, có ngập khi mưa không",
        "Chợ, siêu thị tiện lợi, trạm xe buýt gần nhất",
      ] },
      { h2: "Câu hỏi nên hỏi chủ nhà", ds: [
        "Giá điện, nước, dịch vụ, wifi, rác - tính thế nào",
        "Cọc mấy tháng, bao lâu được hoàn sau khi trả phòng",
        "Có tăng giá hằng năm không, tăng bao nhiêu",
        "Giờ giấc, khách đến chơi, nuôi thú cưng, nấu ăn",
        "Ai sửa chữa khi hư máy lạnh/bình nóng lạnh, bao lâu",
      ] },
      { h2: "Trước khi rời đi", ds: [
        "Chụp ảnh phòng và hợp đồng mẫu để so sánh với phòng khác",
        "Ghi lại mã phòng / địa chỉ, tổng chi phí dự kiến mỗi tháng",
        "Xin 1 ngày suy nghĩ - phòng tốt thật thì chủ nhà vẫn giữ được vài giờ",
      ] },
    ],
  },
  {
    slug: "studio-gac-lung-duplex-khac-nhau-the-nao",
    tieuDe: "Studio, gác lửng, duplex, căn hộ dịch vụ: khác nhau thế nào, chọn loại nào?",
    moTa: "Giải thích các loại phòng cho thuê phổ biến ở TP.HCM - phòng trọ thường, gác lửng, studio, duplex, căn hộ dịch vụ 1PN - ưu nhược điểm và mức giá tham khảo.",
    ngay: "2026-10-03",
    muc: [
      { h2: "Phòng trọ thường", doan: [
        "Một phòng, nhà vệ sinh riêng hoặc chung, thường không nội thất. Rẻ nhất, hợp sinh viên và người đi làm muốn tiết kiệm; đổi lại ít tiện nghi và thường ở hẻm nhỏ.",
      ] },
      { h2: "Phòng có gác lửng", doan: [
        "Có thêm gác (sàn lửng) để ngủ, tầng dưới làm chỗ sinh hoạt/bếp. Được thêm diện tích sử dụng mà giá chỉ nhỉnh hơn phòng thường. Lưu ý gác thấp thì không đứng thẳng được, và mùa nóng gác khá bí nếu không có máy lạnh.",
      ] },
      { h2: "Studio", doan: [
        "Một không gian mở gộp phòng ngủ, sinh hoạt và bếp, thường đã có nội thất (giường, tủ, máy lạnh, kệ bếp) và cửa sổ. Hợp người đi làm ở một mình hoặc cặp đôi. \"Studio tách bếp\" là loại có vách ngăn bếp riêng cho đỡ ám mùi.",
      ] },
      { h2: "Duplex", doan: [
        "Gần giống gác lửng nhưng gác cao, rộng và hoàn thiện như một tầng ngủ thật, thường có cửa sổ lớn và nội thất đầy đủ. Đắt hơn studio cùng diện tích sàn vì được thêm không gian.",
      ] },
      { h2: "Căn hộ dịch vụ / 1 phòng ngủ", doan: [
        "Phòng ngủ tách riêng khỏi phòng khách, thường kèm dọn phòng, giặt sấy, thang máy, bảo vệ. Hợp người cần riêng tư hoặc ở 2 người. Giá cao nhất trong nhóm nhưng ít phát sinh vặt.",
      ] },
      { h2: "Chọn thế nào cho đúng ngân sách", ds: [
        "Ưu tiên tiết kiệm: phòng thường hoặc gác lửng ở quận ven (Bình Tân, Quận 12, Thủ Đức)",
        "Đi làm trung tâm, ở một mình: studio ở Bình Thạnh, Phú Nhuận, Tân Bình - đi lại ngắn bù tiền thuê",
        "Hai người hoặc cần chỗ làm việc ở nhà: duplex hoặc căn hộ 1 phòng ngủ",
        "Xem giá trung vị từng quận ở báo cáo giá thuê của NhaDat Radar trước khi đi xem",
      ] },
    ],
  },
];
