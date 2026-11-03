// BÀI HƯỚNG DẪN & CẨM NANG THỊ TRƯỜNG ở /tin-tuc (SEO & Trust Building)
import { areaPath } from "./slug";

/** lienKet: nút dẫn sang trang phòng / nhà đất theo quận */
export type MucBai = {
  h2: string;
  doan?: string[];
  ds?: string[];
  lienKet?: { nhan: string; href: string }[];
};

export type ArticleCategory = "thue_nha" | "mua_ban" | "phap_ly" | "tai_chinh";

export type BaiViet = {
  slug: string;
  tieuDe: string;
  moTa: string;
  ngay: string;
  category: ArticleCategory;
  categoryName: string;
  readTime: string;
  coverImage: string;
  featured?: boolean;
  muc: MucBai[];
};

const tro = (quan: string, nhan?: string) => ({
  nhan: nhan ?? `Phòng trọ ${quan.replace(/^Quận /, "Q. ")}`,
  href: areaPath("cho_thue", "Hồ Chí Minh", quan, "phong_tro"),
});

const nhaBan = (quan: string, nhan?: string) => ({
  nhan: nhan ?? `Nhà bán ${quan.replace(/^Quận /, "Q. ")}`,
  href: areaPath("ban", "Hồ Chí Minh", quan, "nha"),
});

const baoCao = (slugQuan: string, nhan: string) => ({
  nhan,
  href: `/tin-tuc/gia-thue-phong-tro-${slugQuan}`,
});

export const CATEGORIES: { id: ArticleCategory | "all"; name: string }[] = [
  { id: "all", name: "Tất cả bài viết" },
  { id: "mua_ban", name: "Kinh nghiệm mua bán" },
  { id: "phap_ly", name: "Pháp lý & Quy hoạch" },
  { id: "tai_chinh", name: "Tài chính & Lãi suất" },
  { id: "thue_nha", name: "Cẩm nang thuê phòng" },
];

export const BAI_VIET: BaiViet[] = [
  // --- BÀI VIẾT MỚI: PHÁP LÝ & MUA BÁN ---
  {
    slug: "kiem-tra-phap-ly-quy-hoach-mua-nha-dat",
    tieuDe: "10 bước kiểm tra pháp lý nhà đất, quy hoạch và tránh bẫy đặt cọc",
    moTa: "Hướng dẫn thực chiến từ chuyên gia: cách soi sổ hồng thật/giả, tra cứu quy hoạch đất ở đô thị, kiểm tra tình trạng ngăn chặn giao dịch và các điều khoản đặt cọc bảo vệ người mua.",
    ngay: "2026-10-08",
    category: "phap_ly",
    categoryName: "Pháp lý & Quy hoạch",
    readTime: "7 phút",
    featured: true,
    coverImage: "https://images.unsplash.com/photo-1560518883-ce09059eeffa?w=800&auto=format&fit=crop&q=80",
    muc: [
      {
        h2: "1. Soi kỹ bản chính Sổ Hồng / Sổ Đỏ (Giấy chứng nhận)",
        doan: [
          "Tuyệt đối không bao giờ đặt cọc khi bên bán chỉ cho xem hình ảnh chụp qua điện thoại hay bản photocopy công chứng. Bạn phải cầm trực tiếp bản chính sổ hồng trên tay.",
          "Quan sát các chi tiết bảo mật: họa tiết hoa văn trống đồng sắc nét, dấu nổi cơ quan cấp, quốc huy in dập chìm, số seri sổ và chữ ký của đại diện Sở Tài nguyên và Môi trường. Soi góc dưới trang 4 để xem các nội dung thay đổi đăng bộ gần nhất.",
        ],
      },
      {
        h2: "2. Kiểm tra thông tin người đứng tên và tình trạng hôn nhân",
        doan: [
          "Kiểm tra xem bất động sản là tài sản riêng hay tài sản chung vợ chồng:",
        ],
        ds: [
          "Nếu tài sản hình thành trong thời kỳ hôn nhân: Hợp đồng đặt cọc và hợp đồng chuyển nhượng bắt buộc phải có đủ chữ ký của cả hai vợ chồng.",
          "Nếu là tài sản thừa kế hoặc cho tặng riêng: Phải có văn bản khai nhận di sản thừa kế hoặc hợp đồng tặng cho chứng minh tài sản riêng.",
          "Tránh trường hợp một bên tự ý nhận cọc rồi bên kia khiếu nại hủy hợp đồng, gây kẹt tiền cọc kéo dài.",
        ],
      },
      {
        h2: "3. Tra cứu quy hoạch trực tuyến và tại Ủy ban Quận/Huyện",
        doan: [
          "Hiện nay TP.HCM và các tỉnh lân cận đều có ứng dụng tra cứu quy hoạch (như Thông tin Quy hoạch TP.HCM, Dnailis Đồng Nai, BinhDuong Land...).",
          "Tuy nhiên ứng dụng chỉ mang tính tham khảo ban đầu. Để chắc chắn 100%, bạn nên cùng chủ nhà nộp đơn xin trích lục thông tin quy hoạch tại Bộ phận một cửa của UBND quận/huyện hoặc Phòng Tài nguyên & Môi trường.",
        ],
        ds: [
          "Kiểm tra đất có thuộc diện quy hoạch đất cây xanh, giao thông, công trình công cộng không",
          "Kiểm tra lộ giới hẻm dự phóng: nhà có bị cắt gọt diện tích khi nhà nước mở đường không",
          "Mật độ xây dựng và tầng cao tối đa được phép xây dựng tại khu vực",
        ],
      },
      {
        h2: "4. Kiểm tra xem nhà đất có đang bị thế chấp ngân hàng hay tranh chấp",
        doan: [
          "Xem trang 4 của sổ hồng mục 'Những thay đổi sau khi cấp giấy': nếu có dòng chữ thế chấp bằng con dấu của Văn phòng Đăng ký Đất đai kèm ngày giờ thì nhà đang cắm trong ngân hàng.",
          "Nếu nhà đang thế chấp, bạn cần thực hiện thủ tục giải chấp 3 bên (Người mua - Người bán - Ngân hàng) tại chi nhánh ngân hàng nhận thế chấp. Tiền đặt cọc chỉ chuyển vào tài khoản phong tỏa của ngân hàng để tất toán khoản vay.",
        ],
      },
      {
        h2: "5. Kiểm tra hiện trạng thực tế so với bản vẽ trên sổ",
        doan: [
          "Dùng thước dây hoặc máy đo laser đo thực tế các cạnh của khu đất (mặt tiền, chiều sâu, nở hậu). Rất nhiều trường hợp ranh giới thực tế bị lấn chiếm bởi nhà hàng xóm qua nhiều năm.",
          "Kiểm tra phần diện tích đã hoàn công (nhà xây trên đất): Nếu nhà 3 tầng nhưng trên sổ chỉ ghi đất trống hoặc nhà cấp 4 thì phần nhà chưa hoàn công. Khi mua bạn có nguy cơ bị phạt hoặc cưỡng chế nếu nhà xây sai phép.",
        ],
      },
      {
        h2: "6. Hợp đồng đặt cọc: Điều khoản bắt buộc để không bị mất tiền oan",
        ds: [
          "Ghi rõ thời gian, địa điểm văn phòng công chứng sẽ ký hợp đồng mua bán chuyển nhượng",
          "Ghi rõ số tiền cọc, số tiền còn lại phải thanh toán sau khi ký công chứng",
          "Quy định phạt cọc: bên bán đổi ý không bán phải đền cọc (thường là gấp đôi số tiền cọc)",
          "Điều khoản bất khả kháng: nếu phát hiện nhà dính quy hoạch thu hồi hoặc tranh chấp pháp lý thì bên bán phải hoàn trả 100% tiền cọc",
        ],
      },
    ],
  },
  {
    slug: "bang-lai-suat-vay-mua-nha-cac-ngan-hang",
    tieuDe: "Bảng lãi suất vay mua nhà các ngân hàng: Cách tính lãi & mẹo vay không đuối sức",
    moTa: "Tổng hợp gói lãi suất ưu đãi vay mua nhà từ Big4 (Vietcombank, BIDV, VietinBank) và ngân hàng thương mại cổ phần. Công thức tính gốc lãi hàng tháng và quy tắc vàng 40% thu nhập.",
    ngay: "2026-10-08",
    category: "tai_chinh",
    categoryName: "Tài chính & Lãi suất",
    readTime: "6 phút",
    featured: true,
    coverImage: "https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?w=800&auto=format&fit=crop&q=80",
    muc: [
      {
        h2: "1. Mặt bằng lãi suất vay mua nhà hiện nay",
        doan: [
          "Lãi suất vay mua nhà tại các ngân hàng thường chia làm hai giai đoạn:",
          "Giai đoạn 1 - Lãi suất ưu đãi cố định: Kéo dài từ 6 tháng, 12 tháng, 24 tháng hoặc 36 tháng. Mức lãi dao động từ 5.5% - 7.5%/năm tùy theo nhóm ngân hàng quốc doanh (Big4) hay tư nhân.",
          "Giai đoạn 2 - Lãi suất thả nổi sau ưu đãi: Tính bằng lãi suất cơ sở (hoặc lãi tiền gửi 12 tháng) cộng thêm biên độ từ 3.0% - 3.8%. Hiện tại mức thả nổi rơi vào khoảng 9.0% - 10.5%/năm.",
        ],
      },
      {
        h2: "2. Bảng so sánh các nhóm ngân hàng",
        ds: [
          "Nhóm Big4 (Vietcombank, BIDV, Agribank, VietinBank): Lãi suất ưu đãi tốt nhất, biên độ thả nổi thấp, nhưng hồ sơ thẩm định nguồn thu nhập rất nghiêm ngặt (chứng minh lương chuyển khoản, sao kê thuế).",
          "Nhóm TMCP tư nhân (Techcombank, MB, ACB, VPBank): Thủ tục duyệt hồ sơ linh hoạt và nhanh hơn, giải ngân đa dạng tài sản bảo đảm, nhưng phí phạt trả nợ trước hạn và lãi suất thả nổi thường nhỉnh hơn.",
          "Ngân hàng nước ngoài (Shinhan Bank, Standard Chartered, UOB): Lãi suất cạnh tranh nhất phân khúc, phù hợp cho người có thu nhập cao và lịch sử tín dụng sạch.",
        ],
      },
      {
        h2: "3. Quy tắc vàng 40%: Đừng để tiền trả nợ nuốt chửng cuộc sống",
        doan: [
          "Các chuyên gia tài chính khuyến cáo: Tổng số tiền gốc và lãi bạn phải trả cho ngân hàng mỗi tháng KHÔNG NÊN VƯỢT QUÁ 40% tổng thu nhập khả dụng của cả gia đình.",
          "Ví dụ: Thu nhập hai vợ chồng là 50 triệu/tháng thì mức trả nợ ngân hàng an toàn tối đa là 20 triệu/tháng. 30 triệu còn lại dành cho sinh hoạt phí, con cái học hành và quỹ dự phòng khẩn cấp tối thiểu 6 tháng.",
        ],
      },
      {
        h2: "4. Công cụ tính lãi vay chính xác trên NhaDat Radar",
        doan: [
          "Để biết chính xác mỗi tháng bạn phải trả bao nhiêu tiền gốc và lãi (theo phương pháp dư nợ giảm dần), hãy dùng công cụ Tính lãi vay tự động của NhaDat Radar:",
        ],
        lienKet: [
          { nhan: "Mở công cụ tính lãi vay mua nhà", href: "/tinh-lai-vay" },
          { nhan: "Mở công cụ so sánh Thuê hay Mua", href: "/thue-hay-mua" },
        ],
      },
    ],
  },
  {
    slug: "kinh-nghiem-mua-nha-hem-tphcm",
    tieuDe: "Kinh nghiệm mua nhà hẻm TP.HCM: Lộ giới, hẻm cụt, quy hoạch treo và cách định giá",
    moTa: "Những kinh nghiệm xương máu khi lùng mua nhà phố trong hẻm Sài Gòn: phân biệt hẻm thông vs hẻm cụt, hẻm xe hơi quay đầu, cạm bẫy lộ giới quy hoạch và mẹo đàm phán giảm từ 5% - 10% giá rao.",
    ngay: "2026-10-07",
    category: "mua_ban",
    categoryName: "Kinh nghiệm mua bán",
    readTime: "8 phút",
    featured: true,
    coverImage: "https://images.unsplash.com/photo-1512917774080-9991f1c4c750?w=800&auto=format&fit=crop&q=80",
    muc: [
      {
        h2: "1. Các loại hẻm ở TP.HCM và giá trị tương ứng",
        ds: [
          "Hẻm xe tải tránh nhau (rộng trên 6m): Giá trị tiệm cận mặt tiền, kinh doanh văn phòng, phòng khám hoặc buôn bán nhỏ tốt. Giữ giá và thanh khoản cao nhất.",
          "Hẻm ô tô (rộng 4m - 5m): Ô tô vào được tận cửa nhà. Cần lưu ý bán kính góc cua ở các khúc quanh; hẻm rộng 4m nhưng góc cua hẹp thì xe 7 chỗ vẫn không vào được.",
          "Hẻm ba gác / xe máy (2m - 3.5m): Chiếm đa số tại các quận nội thành (Bình Thạnh, Phú Nhuận, Quận 3, Quận 10). Giá mềm hơn, nhưng di chuyển đồ đạc và sửa chữa xây dựng tốn kém hơn.",
          "Hẻm cụt vs Hẻm thông: Hẻm thông thuận tiện buôn bán, lưu thông nhưng ồn ào; hẻm cụt an ninh và yên tĩnh nhưng hạn chế thoát hiểm khi có hỏa hoạn.",
        ],
      },
      {
        h2: "2. Bẫy lộ giới quy hoạch hẻm: Nhìn nhà 50m² nhưng chỉ còn 30m²",
        doan: [
          "Nhiều căn nhà hẻm có diện tích đất công nhận trên sổ là 50m², nhưng phần gạch chéo thể hiện 'Diện tích thuộc lộ giới quy hoạch' lên tới 15 - 20m².",
          "Khi nhà nước thực hiện mở rộng hẻm, phần diện tích này sẽ bị thu hồi. Nếu bạn xây dựng mới, bạn chỉ được phép xây dựng trên phần diện tích sau khi đã trừ lộ giới. Giá mua phải được tính toán dựa trên diện tích sử dụng lâu dài, không thể tính cào bằng theo giá mét vuông thông thường.",
        ],
      },
      {
        h2: "3. Mẹo khảo sát hàng xóm và môi trường xung quanh",
        doan: [
          "Hãy đi xem nhà vào 3 thời điểm khác nhau:",
        ],
        ds: [
          "Ban ngày (10h - 14h): Kiểm tra hướng nắng, mức độ thông thoáng, độ ồn và ánh sáng tự nhiên.",
          "Giờ tan tầm (17h - 19h): Xem hẻm có bị biến thành đường tắt tránh kẹt xe của người ngoài không, có bị lấn chiếm buôn bán chợ cóc không.",
          "Buổi tối (20h - 22h): Kiểm tra tình hình an ninh, đèn đường chiếu sáng, hàng xóm có hát karaoke hay nhậu nhẹt gây ồn ào không.",
          "Sau cơn mưa lớn hoặc triều cường: Xem hẻm có bị ngập nước đọng bùn hay nghẹt cống không.",
        ],
      },
      {
        h2: "4. Xem giá nhà bán thật tại các quận đang có trên Radar",
        doan: [
          "Tham khảo ngay danh sách nhà bán đã được xác thực thông tin và vị trí trên NhaDat Radar:",
        ],
        lienKet: [
          nhaBan("Quận Tân Bình"),
          nhaBan("Quận Tân Phú"),
          nhaBan("Quận Bình Thạnh"),
          nhaBan("Quận Gò Vấp"),
        ],
      },
    ],
  },
  {
    slug: "quy-trinh-cong-chung-sang-ten-so-hong-a-z",
    tieuDe: "Quy trình mua bán nhà đất công chứng sang tên sổ hồng từ A - Z",
    moTa: "Chi tiết toàn bộ quy trình giao dịch bất động sản an toàn: chuẩn bị hồ sơ công chứng, ký kết hợp đồng, kê khai nộp thuế TNCN và lệ phí trước bạ, nộp hồ sơ đăng bộ sang tên.",
    ngay: "2026-10-06",
    category: "phap_ly",
    categoryName: "Pháp lý & Quy hoạch",
    readTime: "6 phút",
    coverImage: "https://images.unsplash.com/photo-1450133064473-71024230f91b?w=800&auto=format&fit=crop&q=80",
    muc: [
      {
        h2: "Bước 1: Chuẩn bị hồ sơ trước khi ra Văn phòng Công chứng",
        ds: [
          "Bên Bán: Bản chính Giấy chứng nhận (Sổ hồng/Sổ đỏ); Căn cước công dân của các đồng sở hữu; Giấy đăng ký kết hôn (nếu đã kết hôn) hoặc Giấy xác nhận tình trạng hôn nhân (nếu độc thân/ly hôn).",
          "Bên Mua: Căn cước công dân của người đứng tên mua; Giấy đăng ký kết hôn (nếu muốn đứng tên cả hai vợ chồng).",
        ],
      },
      {
        h2: "Bước 2: Ký hợp đồng công chứng và giao nhận tiền",
        doan: [
          "Hai bên có mặt tại Văn phòng công chứng, kiểm tra lại toàn bộ thông tin cá nhân và thông tin thửa đất được in trên hợp đồng mua bán.",
          "Sau khi công chứng viên ký và đóng dấu, hai bên sang ngân hàng thực hiện chuyển khoản thanh toán số tiền còn lại theo thỏa thuận.",
          "Bên mua giữ lại một khoản tiền nhỏ (khoảng 50 - 100 triệu) để đảm bảo bên bán hoàn thành nghĩa vụ đóng thuế và bàn giao nhà trên thực tế.",
        ],
      },
      {
        h2: "Bước 3: Kê khai thuế và nộp nghĩa vụ tài chính",
        ds: [
          "Thuế thu nhập cá nhân (TNCN): 2% tính trên giá trị chuyển nhượng (do bên Bán chịu, trừ trường hợp có thỏa thuận khác).",
          "Lệ phí trước bạ: 0.5% tính trên giá trị chuyển nhượng (do bên Mua chịu).",
          "Phí công chứng và lệ phí thẩm định hồ sơ địa chính.",
        ],
      },
      {
        h2: "Bước 4: Nộp hồ sơ Đăng bộ tại Văn phòng Đăng ký Đất đai",
        doan: [
          "Nộp toàn bộ hồ sơ tại Chi nhánh Văn phòng Đăng ký Đất đai quận/huyện hoặc Bộ phận Tiếp nhận và trả kết quả (Một cửa).",
          "Bạn nhận giấy hẹn (thường từ 10 - 14 ngày làm việc) để đến nhận Giấy chứng nhận đã cập nhật tên chủ sở hữu mới ở trang 4 hoặc cấp đổi phôi sổ mới.",
        ],
      },
    ],
  },

  // --- CẨM NANG THUÊ NHÀ & BÁO CÁO GIÁ ---
  {
    slug: "kinh-nghiem-thue-phong-tro-tphcm-tranh-mat-coc",
    tieuDe: "Kinh nghiệm thuê phòng trọ TP.HCM: 9 điều cần biết để không mất cọc",
    moTa: "Những bước kiểm tra trước khi đặt cọc phòng trọ ở TP.HCM: xem phòng thật, hỏi đủ chi phí, đọc hợp đồng, nhận biết tin ảo và chiêu lừa cọc thường gặp.",
    ngay: "2026-10-03",
    category: "thue_nha",
    categoryName: "Cẩm nang thuê phòng",
    readTime: "5 phút",
    coverImage: "https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=800&auto=format&fit=crop&q=80",
    muc: [
      {
        h2: "1. Luôn đi xem phòng tận nơi trước khi chuyển tiền",
        doan: [
          "Chiêu lừa phổ biến nhất là đăng ảnh phòng đẹp, giá rẻ hơn mặt bằng rồi đòi chuyển khoản \"giữ chỗ\" vì \"nhiều người hỏi\". Không chuyển bất kỳ khoản nào trước khi bạn đứng trong căn phòng đó và gặp người có quyền cho thuê.",
        ],
      },
      {
        h2: "2. So giá với mặt bằng khu vực",
        doan: [
          "Phòng rẻ hơn hẳn các phòng cùng diện tích trong cùng phường là dấu hiệu cần hỏi kỹ: phòng ẩm, kẹt hẻm sâu, chủ sắp bán nhà, hoặc tin ảo. Xem giá trung vị theo từng quận ở mục báo cáo giá của NhaDat Radar để biết mức hợp lý.",
        ],
      },
      {
        h2: "3. Hỏi đủ mọi khoản phải trả mỗi tháng",
        ds: [
          "Giá điện (theo giá nhà nước hay 3.500 - 4.000đ/kWh), nước (theo khối hay theo người)",
          "Phí dịch vụ/quản lý, wifi, rác, gửi xe (xe thứ hai có tính thêm không)",
          "Phí giặt sấy, thang máy, phí khi có người ở thêm",
          "Tiền cọc mấy tháng và điều kiện hoàn cọc",
        ],
      },
      {
        h2: "4. Kiểm tra phòng như người sắp ở 1 năm",
        ds: [
          "Mở thử vòi nước, vòi sen nóng lạnh, máy lạnh; xem vết ố trần và chân tường (dấu hiệu thấm)",
          "Ổ khoá, cửa sổ, lối thoát hiểm, bình chữa cháy; khoá vân tay hay chìa",
          "Sóng điện thoại trong phòng, tiếng ồn giờ cao điểm, mùi cống",
          "Giờ giấc ra vào, có chung chủ không, có cho nuôi thú cưng không",
        ],
      },
      {
        h2: "5. Đọc hợp đồng trước khi ký",
        doan: [
          "Hợp đồng cần ghi rõ: giá thuê và thời hạn, số tiền cọc, các khoản phí, điều kiện tăng giá, điều kiện chấm dứt sớm và cách hoàn cọc. Chụp lại tình trạng phòng (ảnh có ngày giờ) lúc nhận phòng để tránh tranh chấp khi trả.",
        ],
      },
      {
        h2: "6. Cọc ít nhất có thể, chuyển khoản có ghi nội dung",
        doan: [
          "Thông thường cọc 1 tháng. Chuyển khoản với nội dung rõ \"Cọc phòng số ... địa chỉ ...\" và yêu cầu giấy nhận cọc có chữ ký - đây là bằng chứng nếu có tranh chấp.",
        ],
      },
      {
        h2: "7. Nhận biết tin ảo",
        ds: [
          "Ảnh quá đẹp, giống ảnh mẫu khách sạn; cùng ảnh nhưng đăng ở nhiều quận khác nhau",
          "Giá rẻ bất thường, người đăng né gọi video hoặc né cho xem phòng",
          "Đòi cọc online ngay với lý do \"đang có người hỏi\"",
        ],
      },
      {
        h2: "8. Đi xem vào giờ bạn sẽ thực sự ở",
        doan: [
          "Xem buổi tối để biết an ninh, đèn hẻm, tiếng ồn quán nhậu; xem giờ tan tầm để biết đường đi làm có kẹt không.",
        ],
      },
      {
        h2: "9. Tìm phòng ở nơi có phòng đã xác thực",
        doan: [
          "Trên NhaDat Radar, phòng gắn nhãn \"Đã xác minh\" là phòng trống đã được xác thực, có mã phòng riêng; bạn hẹn xem miễn phí và được hỗ trợ thương lượng trực tiếp với chủ nhà.",
        ],
      },
    ],
  },
  {
    slug: "checklist-xem-phong-tro",
    tieuDe: "Checklist xem phòng trọ: 20 thứ cần kiểm tra trong 15 phút",
    moTa: "Danh sách kiểm tra khi đi xem phòng trọ, căn hộ dịch vụ: điện nước, thấm dột, an ninh, chi phí ẩn và câu hỏi nên hỏi chủ nhà.",
    ngay: "2026-10-03",
    category: "thue_nha",
    categoryName: "Cẩm nang thuê phòng",
    readTime: "5 phút",
    coverImage: "https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=800&auto=format&fit=crop&q=80",
    muc: [
      {
        h2: "Trong phòng",
        ds: [
          "Diện tích thật (đo bước chân), trần cao, gác có đứng thẳng được không",
          "Máy lạnh: bật thử 5 phút, có chảy nước không; năm sản xuất",
          "Bình nóng lạnh, áp lực nước vòi sen, thoát nước sàn nhà tắm",
          "Vết ố, mốc ở trần và góc tường; mùi ẩm",
          "Cửa sổ thật (thông gió) hay cửa sổ ra hành lang",
          "Số ổ cắm, vị trí đặt bếp, kệ bếp, chậu rửa",
        ],
      },
      {
        h2: "Toà nhà và khu vực",
        ds: [
          "Khoá cổng vân tay/thẻ, camera, bảo vệ",
          "Chỗ để xe: có mái che không, giới hạn số xe, phí xe thứ hai",
          "Thang máy (nếu tầng cao), lối thoát hiểm, bình chữa cháy",
          "Hẻm rộng bao nhiêu, xe hơi vào được không, có ngập khi mưa không",
          "Chợ, siêu thị tiện lợi, trạm xe buýt gần nhất",
        ],
      },
      {
        h2: "Câu hỏi nên hỏi chủ nhà",
        ds: [
          "Giá điện, nước, dịch vụ, wifi, rác - tính thế nào",
          "Cọc mấy tháng, bao lâu được hoàn sau khi trả phòng",
          "Có tăng giá hằng năm không, tăng bao nhiêu",
          "Giờ giấc, khách đến chơi, nuôi thú cưng, nấu ăn",
          "Ai sửa chữa khi hư máy lạnh/bình nóng lạnh, bao lâu",
        ],
      },
    ],
  },
  {
    slug: "studio-gac-lung-duplex-khac-nhau-the-nao",
    tieuDe: "Studio, gác lửng, duplex, căn hộ dịch vụ: khác nhau thế nào, chọn loại nào?",
    moTa: "Giải thích các loại phòng cho thuê phổ biến ở TP.HCM - phòng trọ thường, gác lửng, studio, duplex, căn hộ dịch vụ 1PN - ưu nhược điểm và mức giá tham khảo.",
    ngay: "2026-10-03",
    category: "thue_nha",
    categoryName: "Cẩm nang thuê phòng",
    readTime: "6 phút",
    coverImage: "https://images.unsplash.com/photo-1493809842364-78817add7ffb?w=800&auto=format&fit=crop&q=80",
    muc: [
      {
        h2: "Phòng trọ thường",
        doan: [
          "Một phòng, nhà vệ sinh riêng hoặc chung, thường không nội thất. Rẻ nhất, hợp sinh viên và người đi làm muốn tiết kiệm; đổi lại ít tiện nghi và thường ở hẻm nhỏ.",
        ],
      },
      {
        h2: "Phòng có gác lửng",
        doan: [
          "Có thêm gác (sàn lửng) để ngủ, tầng dưới làm chỗ sinh hoạt/bếp. Được thêm diện tích sử dụng mà giá chỉ nhỉnh hơn phòng thường. Lưu ý gác thấp thì không đứng thẳng được, và mùa nóng gác khá bí nếu không có máy lạnh.",
        ],
      },
      {
        h2: "Studio",
        doan: [
          "Một không gian mở gộp phòng ngủ, sinh hoạt và bếp, thường đã có nội thất (giường, tủ, máy lạnh, kệ bếp) và cửa sổ. Hợp người đi làm ở một mình hoặc cặp đôi. 'Studio tách bếp' là loại có vách ngăn bếp riêng cho đỡ ám mùi.",
        ],
      },
      {
        h2: "Duplex",
        doan: [
          "Gần giống gác lửng nhưng gác cao, rộng và hoàn thiện như một tầng ngủ thật, thường có cửa sổ lớn và nội thất đầy đủ. Đắt hơn studio cùng diện tích sàn vì được thêm không gian.",
        ],
      },
      {
        h2: "Căn hộ dịch vụ / 1 phòng ngủ",
        doan: [
          "Phòng ngủ tách riêng khỏi phòng khách, thường kèm dọn phòng, giặt sấy, thang máy, bảo vệ. Hợp người cần riêng tư hoặc ở 2 người. Giá cao nhất trong nhóm nhưng ít phát sinh vặt.",
        ],
      },
    ],
  },
  {
    slug: "thue-phong-tro-gan-dai-hoc-tphcm",
    tieuDe: "Thuê phòng trọ gần các trường đại học lớn ở TP.HCM: nên ở khu nào?",
    moTa: "Gợi ý khu vực thuê trọ cho sinh viên theo từng cụm trường ở TP.HCM: Làng Đại học Thủ Đức, Bách Khoa, Kinh tế, Văn Lang, Hutech, Tôn Đức Thắng, Công nghiệp.",
    ngay: "2026-10-03",
    category: "thue_nha",
    categoryName: "Cẩm nang thuê phòng",
    readTime: "7 phút",
    coverImage: "https://images.unsplash.com/photo-1523240795612-9a054b0db644?w=800&auto=format&fit=crop&q=80",
    muc: [
      {
        h2: "Nguyên tắc chung khi chọn trọ gần trường",
        ds: [
          "Ưu tiên quãng đường dưới 20 phút đi xe máy hoặc 1 tuyến xe buýt",
          "Phòng sát cổng trường thường đắt hơn và hết sớm vào tháng 8-9; lùi ra 1-2 km giá dễ chịu hơn rõ rệt",
          "Ở ghép 2-3 người trong phòng có gác lửng là cách giảm tiền thuê hiệu quả nhất",
        ],
      },
      {
        h2: "Làng Đại học Quốc gia (Thủ Đức, giáp Dĩ An)",
        doan: [
          "Cụm trường ĐH Quốc gia TP.HCM. Sinh viên thường thuê quanh Linh Trung, Linh Xuân và phía Dĩ An. Phòng trọ quanh đây nhiều và giá thuộc nhóm mềm nhất thành phố.",
        ],
        lienKet: [tro("TP. Thủ Đức", "Phòng trọ Thủ Đức"), tro("Quận 9", "Phòng trọ Quận 9")],
      },
      {
        h2: "Công nghiệp (IUH) và các trường khu Gò Vấp",
        doan: [
          "Gò Vấp hiện là quận có nhiều phòng trọ nhất trên NhaDat Radar, giá vừa phải, nhiều phòng mới xây có gác và máy lạnh.",
        ],
        lienKet: [tro("Quận Gò Vấp"), baoCao("quan-go-vap", "Giá thuê trọ Gò Vấp")],
      },
    ],
  },
  {
    slug: "tien-dien-nuoc-phong-tro-tinh-the-nao",
    tieuDe: "Tiền điện, nước phòng trọ tính thế nào? Cách hỏi chủ nhà để không bị thu quá tay",
    moTa: "Các cách chủ trọ thường tính tiền điện, nước, dịch vụ ở TP.HCM, cách ước lượng hoá đơn mỗi tháng và những câu cần hỏi rõ trước khi ký hợp đồng thuê phòng.",
    ngay: "2026-10-03",
    category: "thue_nha",
    categoryName: "Cẩm nang thuê phòng",
    readTime: "5 phút",
    coverImage: "https://images.unsplash.com/photo-1473341304170-971dccb5ac1e?w=800&auto=format&fit=crop&q=80",
    muc: [
      {
        h2: "Các kiểu tính tiền điện thường gặp",
        ds: [
          "Giá cố định mỗi kWh do chủ nhà đặt (thường khoảng 3.500 - 4.000đ/kWh), đồng hồ riêng từng phòng - phổ biến nhất",
          "Giá điện sinh hoạt bậc thang của EVN: chủ nhà kê khai định mức theo đầu người",
          "Khoán theo tháng (gồm trong tiền phòng hoặc một mức cố định)",
        ],
      },
      {
        h2: "Mẹo giảm hoá đơn",
        ds: [
          "Cài máy lạnh 26 - 27°C kèm quạt, vệ sinh lưới lọc mỗi tháng",
          "Chụp lại số điện, nước ngày nhận phòng và ngày trả phòng",
          "So tổng chi phí (tiền phòng + điện nước + dịch vụ) giữa các phòng",
        ],
      },
    ],
  },
  // --- 10 BÀI VIẾT MỚI: CẨM NANG & KINH NGHIỆM THỰC CHIẾN BĐS 2026 ---
  {
    slug: "kinh-nghiem-tra-gia-mua-nha-dat-thanh-cong",
    tieuDe: "Nghệ thuật trả giá mua nhà đất: 7 bước thương lượng giúp tiết kiệm cả trăm triệu",
    moTa: "Bí quyết đàm phán giá nhà đất: cách thăm dò lý do bán, dùng giá trung vị khu vực để ép giá hợp lý, thời điểm vàng để chốt mức giảm sâu nhất.",
    ngay: "2026-10-25",
    category: "mua_ban",
    categoryName: "Kinh nghiệm mua bán",
    readTime: "6 phút",
    coverImage: "https://images.unsplash.com/photo-1560518883-ce09059eeffa?w=800&auto=format&fit=crop&q=80",
    muc: [
      {
        h2: "1. Thăm dò động cơ bán của chủ nhà (Tìm điểm yếu để đàm phán)",
        ds: [
          "Chủ nhà đang kẹt nợ ngân hàng đến hạn đáo hạn, cần tiền chia thừa kế, hay chỉ rao thử giá thị trường",
          "Hỏi khéo hàng xóm xung quanh về thời gian căn nhà được rao (nhà rao trên 6 tháng thường chủ đã rất sốt ruột và sẵn sàng bớt giá sâu)",
          "Quan sát thái độ của môi giới: nếu môi giới liên tục hối thúc và chủ động gợi ý bớt giá, đó là tín hiệu chủ nhà đang chịu áp lực thanh khoản lớn",
        ],
      },
      {
        h2: "2. Khảo sát giá trung vị 5 căn tương đồng trong cùng con hẻm",
        ds: [
          "Tra cứu giá trung vị theo m2 trên Radar Nhà Đất ở cùng phường/quận để có con số đối chiếu khách quan",
          "So sánh bề rộng mặt tiền, độ rộng hẻm (xe ba gác hay ô tô tránh nhau), độ sâu của hẻm và số khúc cua",
          "Không để cảm xúc chi phối: luôn có ít nhất 2 phương án nhà khác để sẵn sàng dừng đàm phán nếu chủ giữ giá quá cao",
        ],
        lienKet: [
          { nhan: "Công cụ định giá nhà đất AI", href: "/dinh-gia" },
          { nhan: "Báo cáo giá nhà đất TP.HCM", href: "/thong-ke" },
        ],
      },
      {
        h2: "3. Tìm khiếm khuyết vật lý hoặc quy hoạch để có cớ trả tiền hợp lý",
        ds: [
          "Hẻm đâm hông, thắt hậu nhà, gần cột điện, miệng cống trước cửa hoặc nhà thấm dột tường/trần cần gia cố",
          "Lộ giới dự phóng cắt vào sân hoặc tầng trệt khiến diện tích công nhận trên sổ nhỏ hơn thực tế",
          "Nêu rõ chi phí bạn sẽ phải bỏ ra để sửa chữa, nâng nền, sơn sửa và đề xuất trừ thẳng khoản đó vào giá bán",
        ],
      },
      {
        h2: "4. Chiến thuật ra giá mở đầu: Trả lùi 10% đến 15%",
        ds: [
          "Không bao giờ trả đúng mức giá kỳ vọng ngay lần đầu gặp mặt",
          "Nếu nhà rao 4.2 tỷ và bạn muốn mua 3.8 tỷ, hãy mở đầu ở mức 3.65 - 3.7 tỷ kèm cam kết đặt cọc ngay",
          "Để chủ nhà có cơ hội 'mặc cả ngược', tạo tâm lý đôi bên cùng thắng khi chốt ở mức 3.8 tỷ",
        ],
      },
      {
        h2: "5. Sức mạnh của cọc tiền tươi ngay tại bàn đàm phán",
        ds: [
          "Mang sẵn 50 - 100 triệu tiền mặt đặt lên bàn đàm phán",
          "Hình ảnh tiền tươi trên bàn có tác động tâm lý mạnh mẽ hơn nhiều so với việc chỉ thương lượng qua tin nhắn Zalo",
          "Ghi rõ trong giấy đặt cọc: nếu phát hiện nhà dính quy hoạch treo hoặc tranh chấp không thể công chứng thì chủ nhà phải hoàn cọc 100%",
        ],
      },
    ],
  },
  {
    slug: "chi-phi-an-khi-thue-can-ho-chung-cu",
    tieuDe: "Các loại phí ẩn khi thuê căn hộ chung cư bạn nhất định phải tính trước khi ký hợp đồng",
    moTa: "Tổng hợp chi phí thực tế khi thuê chung cư: phí quản lý, phí gửi xe máy/ô tô, tiền điện nước giá kinh doanh, phí tiện ích hồ bơi gym và mẹo thương lượng chủ nhà bao phí.",
    ngay: "2026-10-26",
    category: "thue_nha",
    categoryName: "Cẩm nang thuê phòng",
    readTime: "5 phút",
    coverImage: "https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?w=800&auto=format&fit=crop&q=80",
    muc: [
      {
        h2: "1. Phí quản lý chung cư (12.000 - 25.000đ/m2/tháng)",
        ds: [
          "Căn 2 phòng ngủ 70m2 có phí quản lý từ 900.000đ đến 1.800.000đ/tháng tùy phân khúc dự án",
          "Kiểm tra rõ trong hợp đồng thuê: giá thuê đã bao gồm phí quản lý hay người thuê phải tự thanh toán riêng cho ban quản lý",
          "Hỏi ban quản lý xem căn hộ hiện có đang bị nợ phí các tháng trước từ chủ cũ hay không",
        ],
      },
      {
        h2: "2. Phí giữ xe máy và ô tô (Khoản phí cố định hàng tháng)",
        ds: [
          "Xe máy: thường dao động 120.000 - 180.000đ/xe/tháng (mỗi căn thường bị giới hạn 2 xe máy)",
          "Ô tô: từ 1.200.000 - 2.500.000đ/tháng (nhiều chung cư trung tâm đang hết chỗ đậu ô tô, phải gửi bãi ngoài đắt đỏ)",
          "Hỏi chủ nhà slot đậu ô tô có đi kèm căn hộ hay không trước khi ký cọc",
        ],
      },
      {
        h2: "3. Giá điện nước tại chung cư: Sinh hoạt hay thương mại?",
        ds: [
          "Chung cư có đồng hồ điện nước riêng theo đơn giá nhà nước EVN và Sawaco",
          "Tuy nhiên một số dòng căn hộ Officetel (văn phòng kết hợp lưu trú) bị tính đơn giá điện nước thương mại cao hơn 20 - 30%",
          "Hỏi rõ chủ nhà về định mức số người sử dụng để làm việc với đơn vị cấp nước nhằm hưởng giá ưu đãi bậc thang",
        ],
      },
      {
        h2: "4. Mẹo thương lượng để chủ nhà bao phí quản lý",
        ds: [
          "Nếu ký hợp đồng từ 1 năm trở lên và thanh toán 3 tháng/lần, hãy đề xuất chủ nhà hỗ trợ 100% phí quản lý",
          "Đưa điều khoản phí dịch vụ cụ thể vào phụ lục hợp đồng kèm mốc thời gian chốt chỉ số công tơ",
        ],
        lienKet: [
          { nhan: "Xem danh sách căn hộ cho thuê", href: "/search?deal=cho_thue" },
          { nhan: "So sánh thuê nhà hay mua nhà", href: "/thue-hay-mua" },
        ],
      },
    ],
  },
  {
    slug: "nhung-dieu-khoan-bay-trong-hop-dong-thue-phong-tro",
    tieuDe: "Những điều khoản bẫy trong hợp đồng thuê phòng trọ và mẫu điều khoản bảo vệ người thuê",
    moTa: "Chỉ ra 6 điều khoản gài bẫy trừ cọc phổ biến của chủ nhà trọ, quy định thời hạn báo trước trả phòng và hướng dẫn kiểm tra biên bản bàn giao tài sản.",
    ngay: "2026-10-27",
    category: "phap_ly",
    categoryName: "Pháp lý & Quy hoạch",
    readTime: "6 phút",
    coverImage: "https://images.unsplash.com/photo-1450133064473-71024230f91b?w=800&auto=format&fit=crop&q=80",
    muc: [
      {
        h2: "1. Bẫy 'Tự ý tăng giá phòng sau 6 tháng'",
        ds: [
          "Nhiều chủ nhà đưa điều khoản: 'Chủ nhà có quyền điều chỉnh giá thuê theo biến động thị trường sau 6 tháng'",
          "Cách khắc phục: Thêm điều khoản 'Giá thuê cố định trong toàn bộ thời hạn hợp đồng (tối thiểu 12 tháng) không được thay đổi'",
        ],
      },
      {
        h2: "2. Bẫy thời hạn thông báo trả phòng để giam cọc",
        ds: [
          "Gài điều khoản yêu cầu báo trước 30 hoặc 45 ngày bằng văn bản, nếu báo qua tin nhắn sẽ không được tính",
          "Yêu cầu ghi rõ trong hợp đồng: 'Người thuê báo trước 30 ngày qua tin nhắn Zalo hoặc SMS đến số điện thoại chủ nhà là hợp lệ'",
        ],
      },
      {
        h2: "3. Mập mờ trong biên bản bàn giao hiện trạng tài sản",
        ds: [
          "Tường ố, vòi nước rỉ sét, điều hòa kêu to từ trước nhưng không ghi nhận trong biên bản",
          "Khi trả phòng chủ nhà bắt phạt tiền sơn lại toàn bộ phòng và thay mới đồ đạc",
          "Giải pháp: Ngày đầu nhận phòng, quay video 4K từng ngóc ngách, chụp cận cảnh các vết xước và gửi ngay vào nhóm Zalo chung với chủ nhà làm bằng chứng",
        ],
      },
      {
        h2: "4. Điều khoản vàng bảo vệ 100% tiền cọc",
        ds: [
          "Bổ sung câu: 'Chủ nhà cam kết hoàn trả 100% tiền cọc ngay trong ngày bàn giao phòng nếu người thuê đã thanh toán đủ tiền điện nước và báo trước đủ 30 ngày'",
          "Quy định rõ thời gian hoàn cọc tối đa không quá 3 ngày làm việc",
        ],
        lienKet: [
          { nhan: "Checklist 20 thứ cần xem phòng trọ", href: "/tin-tuc/checklist-xem-phong-tro" },
          { nhan: "Phòng trọ xác minh tại TP.HCM", href: "/search?deal=cho_thue" },
        ],
      },
    ],
  },
  {
    slug: "co-nen-mua-nha-so-chung-vi-bang-gia-re",
    tieuDe: "Có nên mua nhà sổ chung, vi bằng giá rẻ? Phân tích rủi ro pháp lý và giải pháp bảo toàn vốn",
    moTa: "Sự thật về nhà đất bán giấy tay, vi bằng thừa phát lại. Vì sao giá chỉ bằng 50% thị trường và những rủi ro tranh chấp, mất trắng không thể lường trước.",
    ngay: "2026-10-28",
    category: "phap_ly",
    categoryName: "Pháp lý & Quy hoạch",
    readTime: "7 phút",
    coverImage: "https://images.unsplash.com/photo-1582407947304-fd86f028f716?w=800&auto=format&fit=crop&q=80",
    muc: [
      {
        h2: "1. Bản chất pháp lý của Vi bằng Thừa phát lại",
        ds: [
          "Vi bằng chỉ ghi nhận hành vi giao nhận tiền giữa hai bên tại một thời điểm, hoàn toàn KHÔNG có giá trị thay thế hợp đồng công chứng chuyển nhượng quyền sử dụng đất",
          "Bộ Tư pháp đã nhiều lần cảnh báo cấm thừa phát lại lập vi bằng nhằm mục đích hợp thức hóa việc mua bán nhà đất không đủ điều kiện",
        ],
      },
      {
        h2: "2. Ba rủi ro chết người khi mua nhà vi bằng, sổ chung",
        ds: [
          "Một đồng sở hữu bí mật đem toàn bộ sổ gốc đi thế chấp ngân hàng hoặc vay nóng xã hội đen: nhà bạn có nguy cơ bị siết nợ phát mãi bất cứ lúc nào",
          "Không thể xin phép xây dựng, cải tạo, nâng tầng: nếu căn nhà xuống cấp bạn chỉ có thể sửa chắp vá lén lút",
          "Khi một trong các đồng sở hữu qua đời, tài sản rơi vào tranh chấp thừa kế phức tạp giữa nhiều thế hệ, không ai có thể đứng ra ký giấy tờ",
        ],
      },
      {
        h2: "3. Lời khuyên thiết thực cho người có vốn ít",
        ds: [
          "Với tầm tài chính dưới 1.5 tỷ tại TP.HCM, tuyệt đối không nên dồn toàn bộ tiền tiết kiệm vào nhà vi bằng hẻm nhỏ ngoại thành",
          "Giải pháp thông minh: Dùng số vốn đó gửi tiết kiệm hoặc đầu tư kênh an toàn, trích tiền lãi để thuê một căn hộ/nhà phố khang trang, vừa có môi trường sống tốt vừa không lo mất vốn",
        ],
        lienKet: [
          { nhan: "10 bước kiểm tra quy hoạch & pháp lý", href: "/tin-tuc/kiem-tra-phap-ly-quy-hoach-mua-nha-dat" },
          { nhan: "Tính toán thuê nhà hay mua nhà", href: "/thue-hay-mua" },
        ],
      },
    ],
  },
  {
    slug: "thu-tuc-vay-mua-nha-tra-gop-ngan-hang-2026",
    tieuDe: "Hồ sơ và thủ tục vay mua nhà trả góp ngân hàng: Người có thu nhập tự do cần chuẩn bị gì?",
    moTa: "Hướng dẫn trọn gói quy trình vay vốn ngân hàng mua nhà: cách chứng minh tài chính cho dân tự do (freelancer, buôn bán nhỏ), chọn gói lãi suất ưu đãi và tránh phí phạt trả trước hạn.",
    ngay: "2026-10-29",
    category: "tai_chinh",
    categoryName: "Tài chính & Lãi suất",
    readTime: "6 phút",
    coverImage: "https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?w=800&auto=format&fit=crop&q=80",
    muc: [
      {
        h2: "1. Kiểm tra lịch sử tín dụng CIC: Yếu tố sống còn",
        ds: [
          "Tuyệt đối không để dính nợ nhóm 2 (chậm trả từ 10 - 30 ngày) và nợ xấu nhóm 3 trở lên",
          "Kiểm tra kỹ các khoản trả góp thẻ tín dụng, ví điện tử mua trước trả sau vì chúng làm giảm đáng kể hạn mức vay tối đa của bạn",
        ],
      },
      {
        h2: "2. Cách chứng minh thu nhập cho người làm tự do & tiểu thương",
        ds: [
          "Sao kê tài khoản ngân hàng trong 6 - 12 tháng liên tục thể hiện dòng tiền vào đều đặn mỗi tháng",
          "Hợp đồng cung cấp dịch vụ, hợp đồng hợp tác kinh doanh, hóa đơn bán hàng hoặc biên lai chuyển tiền từ đối tác",
          "Hợp đồng cho thuê tài sản sẵn có (nếu có xe ô tô, đất nông nghiệp hoặc phòng trọ cho thuê khác)",
        ],
      },
      {
        h2: "3. Thẩm định giá tài sản: Ngân hàng cho vay bao nhiêu?",
        ds: [
          "Ngân hàng thường chỉ định giá tài sản bằng 80 - 85% giá thị trường thực tế",
          "Mức cho vay tối đa thông thường là 70% giá trị định giá của ngân hàng (tức là khoảng 55 - 60% số tiền thực tế bạn mua căn nhà)",
          "Ví dụ: Nhà mua 3 tỷ, ngân hàng định giá 2.5 tỷ -> Hạn mức vay tối đa khoảng 1.75 tỷ. Bạn cần chuẩn bị sẵn ít nhất 1.25 tỷ tiền vốn đối ứng",
        ],
        lienKet: [
          { nhan: "Bảng tính lãi suất vay mua nhà", href: "/tinh-lai-vay" },
          { nhan: "Bảng so sánh lãi suất các ngân hàng", href: "/tin-tuc/bang-lai-suat-vay-mua-nha-cac-ngan-hang" },
        ],
      },
      {
        h2: "4. Quy tắc an toàn 40% thu nhập hàng tháng",
        ds: [
          "Tổng số tiền gốc + lãi phải trả hàng tháng không bao giờ được vượt quá 40% tổng thu nhập ròng của gia đình",
          "Luôn chuẩn bị sẵn một quỹ dự phòng tương đương 6 tháng tiền sinh hoạt và trả nợ để phòng rủi ro mất việc hoặc ốm đau",
        ],
      },
    ],
  },
  {
    slug: "cach-nhan-biet-tin-dang-nha-dat-ao-moi-gioi-lua-dao",
    tieuDe: "6 dấu hiệu nhận biết tin đăng nhà đất ảo, môi giới dắt mối đi xem đất tỉnh",
    moTa: "Cảnh giác chiêu trò đăng nhà trung tâm Sài Gòn giá rẻ bất ngờ để lừa khách lên xe chở đi Long An, Đồng Nai. Dấu hiệu số điện thoại ảo và ảnh copy trên mạng.",
    ngay: "2026-10-30",
    category: "mua_ban",
    categoryName: "Kinh nghiệm mua bán",
    readTime: "5 phút",
    coverImage: "https://images.unsplash.com/photo-1570129477492-45c003edd2be?w=800&auto=format&fit=crop&q=80",
    muc: [
      {
        h2: "1. Giá rẻ bất thường: Căn nhà đẹp lung linh ở Bình Thạnh giá 1.8 tỷ",
        ds: [
          "Hình ảnh nhà 3 tầng khang trang, nội thất cao cấp nhưng rao giá chỉ bằng 30% mặt bằng chung",
          "Kèm các dòng chữ tạo tính cấp bách: 'Chủ vỡ nợ bán gấp trước 12h trưa', 'Ngân hàng phát mãi thanh lý giá rẻ'",
        ],
      },
      {
        h2: "2. Kịch bản 'Căn này vừa có người đặt cọc, em dẫn đi xem căn khác đẹp hơn'",
        ds: [
          "Khi bạn gọi điện thoại hoặc đến điểm hẹn, môi giới sẽ báo căn nhà đăng mạng vừa bán xong 15 phút trước",
          "Sau đó chèo kéo bạn lên xe ô tô 7 chỗ hoặc 16 chỗ để đi xem 'dự án đất nền tiềm năng ven đô'",
        ],
      },
      {
        h2: "3. Chiêu trò bẫy khách lên xe đi Long An, Đồng Nai, Bình Dương",
        ds: [
          "Điểm hẹn thường là cây xăng, quán cafe ở cửa ngõ thành phố (Quốc lộ 13, Ngã tư An Sương, Bến xe Miền Đông)",
          "Trên xe luôn có sẵn 'chim mồi' liên tục chốt cọc tiền mặt giả tạo không khí khan hiếm để kích thích bạn xuống tiền",
        ],
      },
      {
        h2: "4. Cách phòng tránh và tự bảo vệ mình",
        ds: [
          "Kiên quyết không lên xe lạ của môi giới: luôn yêu cầu định vị chính xác vị trí căn nhà trên Google Maps trước khi di chuyển",
          "Sử dụng Radar Nhà Đất để tra cứu giá trung vị khu vực: mọi tin đăng rẻ hơn 40% giá trung vị đều tiềm ẩn 99% rủi ro lừa đảo hoặc ảo",
          "Kiểm tra số điện thoại người đăng trên Google hoặc Zalo: môi giới uy tín luôn có thông tin trang cá nhân rõ ràng",
        ],
        lienKet: [
          { nhan: "Tra cứu giá trung vị khu vực", href: "/thong-ke" },
          { nhan: "Kinh nghiệm mua nhà hẻm TP.HCM", href: "/tin-tuc/kinh-nghiem-mua-nha-hem-tphcm" },
        ],
      },
    ],
  },
  {
    slug: "kinh-nghiem-o-ghep-tim-ban-cung-phong-tphcm",
    tieuDe: "Kinh nghiệm tìm bạn ở ghép TP.HCM: Quy tắc chia tiền, bảo vệ tài sản và sinh hoạt chung",
    moTa: "Bí quyết ở ghép không lo xích mích: cách phỏng vấn bạn cùng phòng, bảng phân chia chi phí công bằng, nội quy khách đến chơi và bảo vệ đồ đạc cá nhân.",
    ngay: "2026-10-31",
    category: "thue_nha",
    categoryName: "Cẩm nang thuê phòng",
    readTime: "5 phút",
    coverImage: "https://images.unsplash.com/photo-1529156069898-49953e39b3ac?w=800&auto=format&fit=crop&q=80",
    muc: [
      {
        h2: "1. 5 câu hỏi phỏng vấn trước khi gật đầu ở chung",
        ds: [
          "Giờ giấc sinh hoạt: Bạn là người dậy sớm hay thức khuya làm đêm? Có thường xuyên bật đèn hoặc gọi điện trong phòng lúc nửa đêm không?",
          "Khả năng tài chính và nghề nghiệp ổn định: Nguồn tiền trả phòng hàng tháng đến từ đâu, có nguy cơ trễ hạn đóng tiền không?",
          "Thói quen hút thuốc, uống rượu bia, nuôi thú cưng trong phòng kín",
        ],
      },
      {
        h2: "2. Quy tắc chia chi phí công bằng và minh bạch",
        ds: [
          "Tiền phòng chia đều theo đầu người",
          "Tiền điện: Nếu có bạn dùng máy tính để bàn (PC cấu hình cao) chạy 24/7 hoặc dùng nồi chiên không dầu liên tục thì nên thỏa thuận đóng thêm tiền điện so với người chỉ dùng laptop",
          "Chi phí đồ dùng chung (dầu ăn, mắm muối, nước rửa chén, giấy vệ sinh, túi rác): Lập một quỹ chung mỗi người đóng 100.000đ/tháng",
        ],
      },
      {
        h2: "3. Quy định khách ngoài và bạn bè đến ngủ lại",
        ds: [
          "Phải xin phép và được sự đồng ý của tất cả thành viên trong phòng trước khi mời người lạ về nhà",
          "Nếu có người ở lại qua đêm quá 2 ngày trong tuần, bắt buộc phải phụ đóng thêm tiền điện nước sinh hoạt",
          "Tôn trọng không gian riêng tư: tuyệt đối không dẫn người yêu về sinh hoạt khi bạn cùng phòng đang có mặt",
        ],
      },
      {
        h2: "4. Bản thỏa thuận nội bộ khi một người muốn chuyển đi",
        ds: [
          "Bắt buộc báo trước cho cả phòng ít nhất 30 ngày để cùng đăng bài tìm người thay thế",
          "Nếu chuyển đi đột ngột mà không tìm được người bù vào, người rời đi sẽ phải chịu trách nhiệm thanh toán phần tiền phòng của mình cho tháng đó để bảo toàn tiền cọc cho người ở lại",
        ],
        lienKet: [
          { nhan: "Kinh nghiệm thuê phòng tránh mất cọc", href: "/tin-tuc/kinh-nghiem-thue-phong-tro-tphcm-tranh-mat-coc" },
          { nhan: "Thuê phòng gần các trường đại học", href: "/tin-tuc/thue-phong-tro-gan-dai-hoc-tphcm" },
        ],
      },
    ],
  },
  {
    slug: "thu-tuc-sang-ten-so-do-cho-tang-thua-ke",
    tieuDe: "Thủ tục sang tên sổ đỏ khi bố mẹ cho tặng hoặc thừa kế: Thuế phí và các bước thực hiện",
    moTa: "Hướng dẫn chi tiết thủ tục nhận chuyển nhượng, tặng cho nhà đất trong gia đình: Điều kiện miễn thuế TNCN, hồ sơ công chứng và các bước đăng bộ sang tên sổ hồng.",
    ngay: "2026-11-01",
    category: "phap_ly",
    categoryName: "Pháp lý & Quy hoạch",
    readTime: "6 phút",
    coverImage: "https://images.unsplash.com/photo-1568605117036-5fe5e7bab0b7?w=800&auto=format&fit=crop&q=80",
    muc: [
      {
        h2: "1. Điều kiện được miễn thuế TNCN và Lệ phí trước bạ",
        ds: [
          "Theo Luật Thuế Thu nhập cá nhân, giao dịch tặng cho, thừa kế bất động sản giữa: Vợ với chồng; Cha đẻ, mẹ đẻ với con đẻ; Cha nuôi, mẹ nuôi với con nuôi; Ông bà nội, ông bà ngoại với cháu nội, cháu ngoại; Anh chị em ruột với nhau ĐỀU ĐƯỢC MIỄN 100% THUẾ TNCN",
          "Đồng thời được MIỄN 100% LỆ PHÍ TRƯỚC BẠ khi làm thủ tục sang tên đổi chủ",
        ],
      },
      {
        h2: "2. Hồ sơ cần chuẩn bị đi công chứng hợp đồng cho tặng",
        ds: [
          "Giấy chứng nhận quyền sử dụng đất, quyền sở hữu nhà ở (Sổ hồng/Sổ đỏ bản gốc)",
          "Căn cước công dân gắn chip của bên cho và bên nhận",
          "Giấy tờ chứng minh quan hệ ruột thịt: Giấy khai sinh, Trích lục khai sinh, hoặc Sổ hộ khẩu cũ",
          "Giấy đăng ký kết hôn của bố mẹ hoặc Giấy xác nhận tình trạng hôn nhân",
        ],
      },
      {
        h2: "3. Quy trình nộp hồ sơ đăng bộ tại Văn phòng Đăng ký Đất đai",
        ds: [
          "Bước 1: Nộp hồ sơ tại Bộ phận Một cửa chi nhánh Văn phòng Đăng ký Đất đai cấp quận/huyện nơi có đất",
          "Bước 2: Cơ quan thuế phát hành thông báo miễn thuế trong vòng 3 - 5 ngày làm việc",
          "Bước 3: Nhận sổ mới đã cập nhật tên người được tặng cho ở trang 4 hoặc cấp đổi sổ hồng mới (thời gian thường từ 10 - 15 ngày)",
        ],
        lienKet: [
          { nhan: "Quy trình công chứng sang tên từ A - Z", href: "/tin-tuc/quy-trinh-cong-chung-sang-ten-so-hong-a-z" },
          { nhan: "Kiểm tra pháp lý quy hoạch nhà đất", href: "/tin-tuc/kiem-tra-phap-ly-quy-hoach-mua-nha-dat" },
        ],
      },
    ],
  },
  {
    slug: "tieu-chi-chon-phong-tro-an-ninh-tphcm",
    tieuDe: "Cách kiểm tra an ninh và an toàn phòng cháy chữa cháy của khu trọ trước khi xuống cọc",
    moTa: "Bí quyết thẩm định độ an toàn của nhà trọ: lối thoát hiểm thứ 2, hệ thống PCCC, bãi để xe sạc điện, khóa vân tay và camera giám sát hành lang.",
    ngay: "2026-11-01",
    category: "thue_nha",
    categoryName: "Cẩm nang thuê phòng",
    readTime: "5 phút",
    coverImage: "https://images.unsplash.com/photo-1512917774080-9991f1c4c750?w=800&auto=format&fit=crop&q=80",
    muc: [
      {
        h2: "1. Tiêu chuẩn an toàn PCCC bắt buộc phải kiểm tra",
        ds: [
          "Có ít nhất 2 lối thoát hiểm: ngoài cầu thang bộ chính phải có thang sắt thoát hiểm ngoài trời hoặc lối mở thoát qua ban công/sân thượng sang nhà bên cạnh",
          "Hành lang các tầng và khu nhà xe phải trang bị bình chữa cháy bột/khí CO2 còn hạn sử dụng (đồng hồ áp suất vạch xanh)",
          "Cửa phòng và cửa ban công không bị hàn kín 'chuồng cọp' không có cửa thoát nạn",
        ],
      },
      {
        h2: "2. Quy định an toàn tại hầm xe và trạm sạc xe máy điện",
        ds: [
          "Khu để xe máy điện phải có khu vực sạc riêng biệt, có rơ le tự ngắt khi chập điện hoặc sạc đầy",
          "Khoảng cách giữa các hàng xe đủ rộng để sơ tán khẩn cấp, không để xe bịt kín lối ra cửa chính",
        ],
      },
      {
        h2: "3. Hệ thống an ninh và kiểm soát người lạ",
        ds: [
          "Cổng chính sử dụng khóa vân tay thông minh hoặc thẻ từ có ghi nhận lịch sử ra vào",
          "Camera giám sát 24/7 lắp đặt ở: cổng ra vào, toàn bộ nhà xe và hành lang mỗi tầng",
          "Đèn chiếu sáng hành lang ban đêm phải luôn bật sáng, không có góc khuất tăm tối",
        ],
      },
      {
        h2: "4. Khảo sát môi trường xã hội xung quanh con hẻm",
        ds: [
          "Đi xem phòng vào 2 khung giờ khác nhau: một lần vào ban ngày và một lần vào khoảng 20h - 21h tối",
          "Quan sát con hẻm có tụ tập cờ bạc, hát karaoke ồn ào hoặc thiếu đèn đường hay không",
        ],
        lienKet: [
          { nhan: "Phòng trọ an ninh, có video thực tế", href: "/search?deal=cho_thue" },
          { nhan: "Phân biệt Studio, Duplex, Gác lửng", href: "/tin-tuc/studio-gac-lung-duplex-khac-nhau-the-nao" },
        ],
      },
    ],
  },
  {
    slug: "cach-tinh-thue-thu-nhap-ca-nhan-khi-ban-nha-dat",
    tieuDe: "Cách tính thuế TNCN và lệ phí trước bạ khi mua bán nhà đất: Ai phải trả khoản nào?",
    moTa: "Chi tiết mức thuế 2% thuế thu nhập cá nhân, 0.5% lệ phí trước bạ, phí công chứng khi chuyển nhượng bất động sản. Hướng dẫn hồ sơ xin miễn thuế đối với căn nhà duy nhất.",
    ngay: "2026-11-01",
    category: "tai_chinh",
    categoryName: "Tài chính & Lãi suất",
    readTime: "6 phút",
    coverImage: "https://images.unsplash.com/photo-1551836022-d5d88e9218df?w=800&auto=format&fit=crop&q=80",
    muc: [
      {
        h2: "1. Ai phải nộp khoản thuế phí nào theo quy định pháp luật?",
        ds: [
          "Bên Bán: Chịu Thuế thu nhập cá nhân (TNCN) là 2% tính trên tổng giá trị chuyển nhượng ghi trong hợp đồng",
          "Bên Mua: Chịu Lệ phí trước bạ là 0.5% tính trên giá trị tài sản tính lệ phí trước bạ của Nhà nước ban hành (hoặc giá hợp đồng nếu cao hơn)",
          "Lưu ý: Hai bên hoàn toàn có quyền tự thỏa thuận với nhau về việc ai là người thanh toán toàn bộ các khoản thuế phí này (thường ghi 'giá bán bao trọn gói thuế phí' hoặc 'bên mua tự chịu hết')",
        ],
      },
      {
        h2: "2. Phí công chứng và thù lao công chứng tính thế nào?",
        ds: [
          "Phí công chứng tính theo Thông tư liên tịch của Bộ Tư pháp và Bộ Tài chính dựa trên giá trị hợp đồng:",
          "Từ 1 tỷ đến 3 tỷ: 1 triệu đồng + 0.06% của phần giá trị tài sản vượt quá 1 tỷ",
          "Từ 3 tỷ đến 5 tỷ: 2.2 triệu đồng + 0.05% của phần giá trị tài sản vượt quá 3 tỷ",
          "Khoản này thường do bên mua thanh toán hoặc chia đôi 50/50 theo thông lệ thị trường",
        ],
      },
      {
        h2: "3. Điều kiện xin miễn 100% thuế TNCN khi bán căn nhà duy nhất",
        ds: [
          "Tại thời điểm chuyển nhượng, người bán chỉ có duy nhất quyền sở hữu một nhà ở hoặc quyền sử dụng một thửa đất trên toàn lãnh thổ Việt Nam",
          "Thời gian sở hữu nhà ở/đất ở tính đến thời điểm chuyển nhượng tối thiểu từ 183 ngày trở lên",
          "Phải chuyển nhượng toàn bộ nhà ở, đất ở (chuyển nhượng một phần sẽ không được miễn thuế)",
        ],
      },
      {
        h2: "4. Cảnh báo rủi ro khi 'khai hai giá' để né thuế",
        ds: [
          "Kê khai giá trên hợp đồng công chứng thấp hơn nhiều so với giá trị giao dịch thực tế để trốn thuế là hành vi vi phạm pháp luật nghiêm trọng",
          "Nếu bị cơ quan thuế truy thu hoặc xảy ra tranh chấp hủy hợp đồng, tòa án sẽ chỉ bảo vệ số tiền ghi trên hợp đồng công chứng, người mua có nguy cơ mất toàn bộ khoản tiền chênh lệch ngoài hợp đồng",
        ],
        lienKet: [
          { nhan: "Quy trình công chứng sang tên sổ hồng", href: "/tin-tuc/quy-trinh-cong-chung-sang-ten-so-hong-a-z" },
          { nhan: "Công cụ định giá nhà đất chuẩn xác", href: "/dinh-gia" },
        ],
      },
    ],
  },
];
