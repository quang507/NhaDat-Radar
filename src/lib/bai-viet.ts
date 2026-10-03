// BÀI HƯỚNG DẪN CỐ ĐỊNH ở /tin-tuc (3/10, SEO). Viết cho người đi thuê phòng ở TP.HCM - câu hỏi hay gặp nhất
// khi tìm trọ. Nội dung chung, không hứa hẹn pháp lý; số liệu giá cụ thể nằm ở báo cáo giá theo quận (bao-cao-gia).
import { areaPath } from "./slug";

/** lienKet: nút dẫn sang trang phòng theo quận (liên kết nội bộ cho SEO + đưa người đọc tới phòng thật) */
export type MucBai = { h2: string; doan?: string[]; ds?: string[]; lienKet?: { nhan: string; href: string }[] };
const tro = (quan: string, nhan?: string) => ({ nhan: nhan ?? `Phòng trọ ${quan.replace(/^Quận /, "Q. ")}`, href: areaPath("cho_thue", "Hồ Chí Minh", quan, "phong_tro") });
const baoCao = (slugQuan: string, nhan: string) => ({ nhan, href: `/tin-tuc/gia-thue-phong-tro-${slugQuan}` });
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
  {
    slug: "thue-phong-tro-gan-dai-hoc-tphcm",
    tieuDe: "Thuê phòng trọ gần các trường đại học lớn ở TP.HCM: nên ở khu nào?",
    moTa: "Gợi ý khu vực thuê trọ cho sinh viên theo từng cụm trường ở TP.HCM: Làng Đại học Thủ Đức, Bách Khoa, Kinh tế, Văn Lang, Hutech, Tôn Đức Thắng, Công nghiệp - kèm mẹo chọn phòng hợp túi tiền.",
    ngay: "2026-10-03",
    muc: [
      { h2: "Nguyên tắc chung khi chọn trọ gần trường", ds: [
        "Ưu tiên quãng đường dưới 20 phút đi xe máy hoặc 1 tuyến xe buýt - giờ cao điểm TP.HCM kẹt nặng, đi xa 5 km có thể mất 40 phút",
        "Phòng sát cổng trường thường đắt hơn và hết sớm vào tháng 8-9; lùi ra 1-2 km giá dễ chịu hơn rõ rệt",
        "Tìm phòng từ tháng 6-7 trước năm học, hoặc giữa học kỳ khi có người trả phòng",
        "Ở ghép 2-3 người trong phòng có gác lửng là cách giảm tiền thuê hiệu quả nhất",
      ] },
      { h2: "Làng Đại học Quốc gia (Thủ Đức, giáp Dĩ An)", doan: [
        "Cụm trường ĐH Quốc gia TP.HCM (Khoa học Tự nhiên, Nhân văn, Công nghệ Thông tin, Kinh tế - Luật, Quốc tế, Bách Khoa cơ sở 2...). Sinh viên thường thuê quanh Linh Trung, Linh Xuân và phía Dĩ An. Ký túc xá lớn nhưng không đủ chỗ cho tất cả; phòng trọ quanh đây nhiều và giá thuộc nhóm mềm của thành phố.",
      ], lienKet: [tro("TP. Thủ Đức", "Phòng trọ Thủ Đức"), tro("Quận 9", "Phòng trọ Quận 9")] },
      { h2: "Bách Khoa, Kinh tế (UEH), Sư phạm, Y Dược - khu trung tâm", doan: [
        "Các trường ở Quận 10, Quận 3, Quận 5 nằm ở khu đông dân, phòng nhỏ và giá cao hơn mặt bằng. Nhiều sinh viên chọn ở Quận 11, Tân Bình hoặc Quận 8 rồi đi xe 10-15 phút để có phòng rộng hơn với cùng số tiền.",
      ], lienKet: [tro("Quận 10"), tro("Quận 3"), tro("Quận 11"), tro("Quận 8")] },
      { h2: "Văn Lang, Hutech, Giao thông Vận tải, Ngoại thương cơ sở 2 - Bình Thạnh", doan: [
        "Bình Thạnh có rất nhiều phòng trọ và studio, đủ mọi tầm giá. Khu sát các trường giá cao hơn; vào sâu các hẻm lớn trong quận thì mềm hơn mà vẫn đi học dưới 15 phút.",
      ], lienKet: [tro("Quận Bình Thạnh"), baoCao("quan-binh-thanh", "Giá thuê trọ Bình Thạnh")] },
      { h2: "Công nghiệp (IUH) và các trường khu Gò Vấp", doan: [
        "Gò Vấp hiện là quận có nhiều phòng trọ nhất trên NhaDat Radar, giá vừa phải, nhiều phòng mới xây có gác và máy lạnh. Hợp sinh viên IUH và cả sinh viên các trường ở Bình Thạnh, Phú Nhuận.",
      ], lienKet: [tro("Quận Gò Vấp"), baoCao("quan-go-vap", "Giá thuê trọ Gò Vấp")] },
      { h2: "Tôn Đức Thắng, RMIT và các trường khu Nam", doan: [
        "Quanh Quận 7 phòng đẹp nhưng giá cao do gần Phú Mỹ Hưng. Sinh viên thường lùi về Quận 8, Nhà Bè hoặc Bình Chánh để tiết kiệm, đổi lại đi xa hơn và cần để ý đường hay ngập khi mưa.",
      ], lienKet: [tro("Quận 7"), tro("Quận 8"), tro("Huyện Nhà Bè", "Phòng trọ Nhà Bè")] },
      { h2: "Trước khi đặt cọc", doan: [
        "Đi xem phòng tận nơi, hỏi đủ tiền điện nước, xe, wifi và đọc kỹ điều kiện hoàn cọc - xem thêm bài \"9 điều cần biết để không mất cọc\" trong mục tin tức.",
      ] },
    ],
  },
  {
    slug: "nen-thue-phong-tro-quan-nao-tphcm",
    tieuDe: "Nên thuê phòng trọ quận nào ở TP.HCM? So sánh theo ngân sách và nơi làm việc",
    moTa: "Chọn quận thuê trọ ở TP.HCM theo ngân sách và chỗ làm: quận trung tâm, quận ven, khu nhiều phòng nhất, ưu nhược điểm từng khu và cách so giá thực tế trước khi đi xem.",
    ngay: "2026-10-03",
    muc: [
      { h2: "Bắt đầu từ nơi làm việc, không phải từ giá", doan: [
        "Tiền thuê rẻ hơn 500 nghìn mỗi tháng nhưng mỗi ngày đi thêm 1 tiếng là bạn đang trả bằng thời gian, xăng và sức khoẻ. Khoanh vùng trong bán kính 20-30 phút đi xe từ chỗ làm, rồi mới so giá giữa các quận trong vùng đó.",
      ] },
      { h2: "Khu trung tâm: Quận 1, Quận 3, Phú Nhuận", doan: [
        "Đi đâu cũng gần, nhiều tiện ích. Đổi lại phòng nhỏ, giá cao, chỗ để xe chật. Hợp người làm ở trung tâm, ở một mình, ưu tiên thời gian.",
      ], lienKet: [tro("Quận 1"), tro("Quận 3"), tro("Quận Phú Nhuận"), baoCao("quan-phu-nhuan", "Giá thuê trọ Phú Nhuận")] },
      { h2: "Khu nhiều phòng nhất: Gò Vấp, Bình Thạnh, Tân Bình", doan: [
        "Ba quận này có lượng phòng trọ, studio lớn nhất, nhiều phòng mới xây, dễ chọn và dễ thương lượng. Tân Bình tiện cho người làm gần sân bay, khu Cộng Hoà - Trường Chinh; Bình Thạnh gần trung tâm và Thủ Đức; Gò Vấp thường mềm hơn hai quận còn lại.",
      ], lienKet: [tro("Quận Gò Vấp"), tro("Quận Bình Thạnh"), tro("Quận Tân Bình"), baoCao("quan-tan-binh", "Giá thuê trọ Tân Bình")] },
      { h2: "Quận ven tiết kiệm: Quận 12, Bình Tân, Tân Phú, Bình Chánh", doan: [
        "Giá dễ chịu, phòng rộng hơn, nhiều khu trọ gần khu công nghiệp và chợ. Hợp người làm ở các khu công nghiệp phía Tây - Bắc hoặc gia đình nhỏ cần phòng rộng. Lưu ý một số tuyến đường hay kẹt giờ cao điểm và ngập khi mưa lớn.",
      ], lienKet: [tro("Quận 12"), tro("Quận Bình Tân"), tro("Quận Tân Phú"), tro("Huyện Bình Chánh", "Phòng trọ Bình Chánh")] },
      { h2: "Phía Đông: Thủ Đức (Quận 2, Quận 9 cũ)", doan: [
        "Khu Thảo Điền, An Phú (Quận 2 cũ) nhiều căn hộ dịch vụ cao cấp; Quận 9 cũ và khu Làng Đại học giá mềm, nhiều phòng cho sinh viên và người làm khu công nghệ cao.",
      ], lienKet: [tro("Quận 2"), tro("Quận 9"), tro("TP. Thủ Đức", "Phòng trọ Thủ Đức")] },
      { h2: "Cách so giá trước khi đi xem", ds: [
        "Xem giá trung vị phòng trọ từng quận trong mục báo cáo giá của NhaDat Radar (cập nhật mỗi ngày từ phòng đang cho thuê)",
        "So cùng khoảng diện tích - giá theo m² mới so sánh được giữa các phòng",
        "Cộng thêm điện, nước, dịch vụ, xe để ra tổng chi phí thật mỗi tháng",
      ] },
    ],
  },
  {
    slug: "tien-dien-nuoc-phong-tro-tinh-the-nao",
    tieuDe: "Tiền điện, nước phòng trọ tính thế nào? Cách hỏi chủ nhà để không bị thu quá tay",
    moTa: "Các cách chủ trọ thường tính tiền điện, nước, dịch vụ ở TP.HCM, cách ước lượng hoá đơn mỗi tháng và những câu cần hỏi rõ trước khi ký hợp đồng thuê phòng.",
    ngay: "2026-10-03",
    muc: [
      { h2: "Các kiểu tính tiền điện thường gặp", ds: [
        "Giá cố định mỗi kWh do chủ nhà đặt (thường khoảng 3.500 - 4.000đ/kWh), đồng hồ riêng từng phòng - phổ biến nhất",
        "Giá điện sinh hoạt bậc thang của EVN: chủ nhà kê khai số người thuê với điện lực để được cấp định mức, người thuê trả gần đúng giá nhà nước",
        "Khoán theo tháng (gồm trong tiền phòng hoặc một mức cố định) - hay gặp ở căn hộ dịch vụ",
      ] },
      { h2: "Ước lượng tiền điện một tháng", doan: [
        "Máy lạnh là thiết bị tốn điện nhất: một máy 1 HP chạy khoảng 8 tiếng mỗi đêm có thể dùng 150 - 250 kWh/tháng tuỳ đời máy và nhiệt độ cài. Nhân với giá mỗi kWh chủ nhà đưa ra để biết con số thật, đừng chỉ nhìn tiền phòng.",
      ] },
      { h2: "Tiền nước", ds: [
        "Theo khối (m³) có đồng hồ riêng - minh bạch nhất",
        "Theo đầu người mỗi tháng - đơn giản, nhưng bất lợi khi ở đông người mà dùng ít nước",
      ] },
      { h2: "Những câu cần hỏi trước khi ký", ds: [
        "Điện tính bao nhiêu một số, đồng hồ riêng hay chung, ai ghi số và ghi ngày nào",
        "Nước tính theo khối hay theo người",
        "Phí dịch vụ gồm những gì: rác, wifi, vệ sinh hành lang, thang máy, camera",
        "Xe thứ hai, xe đạp điện có tính thêm không",
        "Chủ nhà có tăng giá điện nước giữa hợp đồng không - nên ghi rõ vào hợp đồng",
      ] },
      { h2: "Mẹo giảm hoá đơn", ds: [
        "Cài máy lạnh 26 - 27°C kèm quạt, vệ sinh lưới lọc mỗi tháng",
        "Chụp lại số điện, nước ngày nhận phòng và ngày trả phòng",
        "So tổng chi phí (tiền phòng + điện nước + dịch vụ) giữa các phòng, không so riêng tiền phòng",
      ] },
    ],
  },
  {
    slug: "dang-ky-tam-tru-khi-thue-phong-tro",
    tieuDe: "Đăng ký tạm trú khi thuê phòng trọ: khi nào cần, làm ở đâu, chuẩn bị gì",
    moTa: "Hướng dẫn chung về đăng ký tạm trú cho người thuê phòng trọ, căn hộ: khi nào cần đăng ký, làm trực tuyến qua VNeID hoặc Cổng dịch vụ công, giấy tờ cần chuẩn bị và vai trò của chủ nhà.",
    ngay: "2026-10-03",
    muc: [
      { h2: "Khi nào cần đăng ký tạm trú", doan: [
        "Theo Luật Cư trú, người đến sinh sống ở chỗ ở hợp pháp ngoài nơi thường trú từ 30 ngày trở lên thì phải đăng ký tạm trú. Thuê phòng trọ để ở lâu dài, đi học hay đi làm đều thuộc trường hợp này. Bài viết chỉ mang tính tham khảo - thủ tục chi tiết có thể thay đổi, hãy hỏi công an xã/phường nơi bạn ở.",
      ] },
      { h2: "Làm ở đâu", ds: [
        "Trực tuyến qua ứng dụng VNeID hoặc Cổng dịch vụ công quốc gia - không phải xếp hàng",
        "Trực tiếp tại công an xã/phường nơi có phòng trọ",
      ] },
      { h2: "Thường cần chuẩn bị", ds: [
        "Căn cước của người thuê",
        "Giấy tờ chứng minh chỗ ở hợp pháp: hợp đồng thuê phòng, hoặc sự đồng ý của chủ nhà",
        "Tờ khai thay đổi thông tin cư trú (điền trên ứng dụng nếu làm trực tuyến)",
      ] },
      { h2: "Vai trò của chủ nhà", doan: [
        "Chủ nhà cho thuê cần đồng ý cho người thuê đăng ký tạm trú tại chỗ ở của mình. Nhiều khu trọ chủ nhà đứng ra làm giúp cho cả dãy. Khi đi xem phòng, nên hỏi luôn chủ nhà có hỗ trợ đăng ký tạm trú không - đây cũng là một dấu hiệu chủ nhà làm ăn đàng hoàng.",
      ] },
      { h2: "Lợi ích cho người thuê", ds: [
        "Thuận tiện khi làm giấy tờ, nhận thư từ, cho con đi học",
        "Có căn cứ chứng minh chỗ ở khi có tranh chấp với chủ nhà",
      ] },
    ],
  },
  {
    slug: "kinh-nghiem-o-ghep-tphcm",
    tieuDe: "Kinh nghiệm ở ghép ở TP.HCM: tìm bạn cùng phòng, chia tiền và tránh mâu thuẫn",
    moTa: "Ở ghép giúp giảm một nửa tiền thuê nhưng dễ mâu thuẫn. Cách chọn phòng để ở ghép, tìm bạn cùng phòng an toàn, chia tiền điện nước công bằng và thoả thuận cần có từ đầu.",
    ngay: "2026-10-03",
    muc: [
      { h2: "Chọn phòng nào để ở ghép", ds: [
        "Phòng có gác lửng hoặc duplex: mỗi người một tầng, đỡ vướng nhau",
        "Diện tích từ khoảng 20 m² trở lên cho 2 người, có cửa sổ",
        "Hỏi trước chủ nhà cho tối đa mấy người ở và có tính thêm tiền theo đầu người không",
      ] },
      { h2: "Tìm bạn cùng phòng", ds: [
        "Ưu tiên người quen, đồng nghiệp, bạn cùng trường; với người lạ nên gặp trực tiếp ít nhất một lần",
        "Hỏi rõ giờ giấc đi làm, đi ngủ, nấu ăn, khách đến chơi, hút thuốc, thú cưng",
        "Cả hai cùng đứng tên hợp đồng hoặc cùng ký phụ lục, tránh một người gánh hết trách nhiệm cọc",
      ] },
      { h2: "Chia tiền công bằng", ds: [
        "Tiền phòng: chia đều, hoặc người ở tầng/góc tốt hơn trả nhỉnh hơn",
        "Điện: nếu một người dùng máy lạnh nhiều hơn hẳn, thoả thuận tỉ lệ từ đầu",
        "Ghi chi tiêu chung vào một bảng hoặc ứng dụng, chốt sổ mỗi tháng",
      ] },
      { h2: "Thoả thuận nên có từ ngày đầu", ds: [
        "Lịch dọn dẹp, đổ rác",
        "Báo trước bao lâu nếu một người muốn chuyển đi, ai tìm người thay",
        "Tiền cọc chia thế nào khi trả phòng",
      ] },
      { h2: "Tìm phòng phù hợp để ở ghép", doan: [
        "Lọc phòng trọ có gác hoặc diện tích lớn ở các quận nhiều phòng như Gò Vấp, Bình Thạnh, Tân Bình để có nhiều lựa chọn và dễ thương lượng giá.",
      ], lienKet: [tro("Quận Gò Vấp"), tro("Quận Bình Thạnh"), tro("Quận Tân Bình")] },
    ],
  },
  {
    slug: "tra-phong-tro-lay-lai-tien-coc",
    tieuDe: "Trả phòng trọ thế nào để lấy lại đủ tiền cọc?",
    moTa: "Các bước trả phòng trọ, căn hộ thuê để được hoàn cọc đầy đủ: báo trước đúng hạn, chụp ảnh tình trạng phòng, chốt điện nước và xử lý khi chủ nhà giữ cọc vô lý.",
    ngay: "2026-10-03",
    muc: [
      { h2: "1. Đọc lại điều khoản trả phòng trong hợp đồng", doan: [
        "Xem bạn phải báo trước bao nhiêu ngày (thường 15 - 30 ngày), trả phòng trước hạn hợp đồng có bị mất cọc không, và những khoản chủ nhà được trừ vào cọc.",
      ] },
      { h2: "2. Báo trả phòng bằng tin nhắn", doan: [
        "Báo bằng tin nhắn Zalo/SMS ghi rõ ngày trả phòng để có bằng chứng thời điểm báo, thay vì chỉ nói miệng.",
      ] },
      { h2: "3. Trả phòng đúng tình trạng ban đầu", ds: [
        "Dọn sạch phòng, gỡ đinh, băng keo trên tường",
        "Báo hư hỏng phát sinh trong quá trình ở và thoả thuận sửa trước ngày trả",
        "So với ảnh chụp lúc nhận phòng (nếu đã chụp) - đây là bằng chứng tốt nhất",
      ] },
      { h2: "4. Chốt điện nước cùng chủ nhà", doan: [
        "Chụp số điện, nước ngày trả phòng có cả hai bên xác nhận, thanh toán phần còn lại, nhận lại cọc rồi mới bàn giao chìa khoá/thẻ từ.",
      ] },
      { h2: "5. Nếu chủ nhà giữ cọc vô lý", ds: [
        "Nhắn lại đề nghị hoàn cọc, dẫn đúng điều khoản trong hợp đồng",
        "Nhờ tổ dân phố hoặc công an phường hoà giải",
        "Giữ lại hợp đồng, giấy nhận cọc, tin nhắn, ảnh chụp - đó là căn cứ nếu phải giải quyết tiếp",
      ] },
      { h2: "Tìm phòng mới", doan: [
        "Chuyển chỗ ở? Xem phòng trống đã xác thực trên NhaDat Radar - có ảnh thật, giá rõ, hẹn xem miễn phí.",
      ], lienKet: [{ nhan: "Xem phòng cho thuê", href: "/nha-dat-cho-thue" }] },
    ],
  },
];
