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
  // --- 10 B?I VI?T M?I: C?M NANG & KINH NGHI?M TH?C CHI?N B?S 2026 ---
  {
    slug: "kinh-nghiem-tra-gia-mua-nha-dat-thanh-cong",
    tieuDe: "Ngh? thu?t tr? gi? mua nh? ??t: 7 b??c th??ng l??ng gi?p ti?t ki?m c? tr?m tri?u",
    moTa: "B? quy?t ??m ph?n gi? nh? ??t: c?ch th?m d? l? do b?n, d?ng gi? trung v? khu v?c ?? ?p gi? h?p l?, th?i ?i?m v?ng ?? ch?t m?c gi?m s?u nh?t.",
    ngay: "2026-10-25",
    category: "mua_ban",
    categoryName: "Kinh nghi?m mua b?n",
    readTime: "6 ph?t",
    coverImage: "https://images.unsplash.com/photo-1560518883-ce09059eeffa?w=800&auto=format&fit=crop&q=80",
    muc: [
      {
        h2: "1. Th?m d? ??ng c? b?n c?a ch? nh? (T?m ?i?m y?u ?? ??m ph?n)",
        ds: [
          "Ch? nh? ?ang k?t n? ng?n h?ng ??n h?n ??o h?n, c?n ti?n chia th?a k?, hay ch? rao th? gi? th? tr??ng",
          "H?i kh?o h?ng x?m xung quanh v? th?i gian c?n nh? ???c rao (nh? rao tr?n 6 th?ng th??ng ch? ?? r?t s?t ru?t v? s?n s?ng b?t gi? s?u)",
          "Quan s?t th?i ?? c?a m?i gi?i: n?u m?i gi?i li?n t?c h?i th?c v? ch? ??ng g?i ? b?t gi?, ?? l? t?n hi?u ch? nh? ?ang ch?u ?p l?c thanh kho?n l?n",
        ],
      },
      {
        h2: "2. Kh?o s?t gi? trung v? 5 c?n t??ng ??ng trong c?ng con h?m",
        ds: [
          "Tra c?u gi? trung v? theo m2 tr?n Radar Nh? ??t ? c?ng ph??ng/qu?n ?? c? con s? ??i chi?u kh?ch quan",
          "So s?nh b? r?ng m?t ti?n, ?? r?ng h?m (xe ba g?c hay ? t? tr?nh nhau), ?? s?u c?a h?m v? s? kh?c cua",
          "Kh?ng ?? c?m x?c chi ph?i: lu?n c? ?t nh?t 2 ph??ng ?n nh? kh?c ?? s?n s?ng d?ng ??m ph?n n?u ch? gi? gi? qu? cao",
        ],
        lienKet: [
          { nhan: "C?ng c? ??nh gi? nh? ??t AI", href: "/dinh-gia" },
          { nhan: "B?o c?o gi? nh? ??t TP.HCM", href: "/thong-ke" },
        ],
      },
      {
        h2: "3. T?m khi?m khuy?t v?t l? ho?c quy ho?ch ?? c? c? tr? ti?n h?p l?",
        ds: [
          "H?m ??m h?ng, th?t h?u nh?, g?n c?t ?i?n, mi?ng c?ng tr??c c?a ho?c nh? th?m d?t t??ng/tr?n c?n gia c?",
          "L? gi?i d? ph?ng c?t v?o s?n ho?c t?ng tr?t khi?n di?n t?ch c?ng nh?n tr?n s? nh? h?n th?c t?",
          "N?u r? chi ph? b?n s? ph?i b? ra ?? s?a ch?a, n?ng n?n, s?n s?a v? ?? xu?t tr? th?ng kho?n ?? v?o gi? b?n",
        ],
      },
      {
        h2: "4. Chi?n thu?t ra gi? m? ??u: Tr? l?i 10% ??n 15%",
        ds: [
          "Kh?ng bao gi? tr? ??ng m?c gi? k? v?ng ngay l?n ??u g?p m?t",
          "N?u nh? rao 4.2 t? v? b?n mu?n mua 3.8 t?, h?y m? ??u ? m?c 3.65 - 3.7 t? k?m cam k?t ??t c?c ngay",
          "?? ch? nh? c? c? h?i 'm?c c? ng??c', t?o t?m l? ??i b?n c?ng th?ng khi ch?t ? m?c 3.8 t?",
        ],
      },
      {
        h2: "5. S?c m?nh c?a c?c ti?n t??i ngay t?i b?n ??m ph?n",
        ds: [
          "Mang s?n 50 - 100 tri?u ti?n m?t ??t l?n b?n ??m ph?n",
          "H?nh ?nh ti?n t??i tr?n b?n c? t?c ??ng t?m l? m?nh m? h?n nhi?u so v?i vi?c ch? th??ng l??ng qua tin nh?n Zalo",
          "Ghi r? trong gi?y ??t c?c: n?u ph?t hi?n nh? d?nh quy ho?ch treo ho?c tranh ch?p kh?ng th? c?ng ch?ng th? ch? nh? ph?i ho?n c?c 100%",
        ],
      },
    ],
  },
  {
    slug: "chi-phi-an-khi-thue-can-ho-chung-cu",
    tieuDe: "C?c lo?i ph? ?n khi thu? c?n h? chung c? b?n nh?t ??nh ph?i t?nh tr??c khi k? h?p ??ng",
    moTa: "T?ng h?p chi ph? th?c t? khi thu? chung c?: ph? qu?n l?, ph? g?i xe m?y/? t?, ti?n ?i?n n??c gi? kinh doanh, ph? ti?n ?ch h? b?i gym v? m?o th??ng l??ng ch? nh? bao ph?.",
    ngay: "2026-10-26",
    category: "thue_nha",
    categoryName: "C?m nang thu? ph?ng",
    readTime: "5 ph?t",
    coverImage: "https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?w=800&auto=format&fit=crop&q=80",
    muc: [
      {
        h2: "1. Ph? qu?n l? chung c? (12.000 - 25.000?/m2/th?ng)",
        ds: [
          "C?n 2 ph?ng ng? 70m2 c? ph? qu?n l? t? 900.000? ??n 1.800.000?/th?ng t?y ph?n kh?c d? ?n",
          "Ki?m tra r? trong h?p ??ng thu?: gi? thu? ?? bao g?m ph? qu?n l? hay ng??i thu? ph?i t? thanh to?n ri?ng cho ban qu?n l?",
          "H?i ban qu?n l? xem c?n h? hi?n c? ?ang b? n? ph? c?c th?ng tr??c t? ch? c? hay kh?ng",
        ],
      },
      {
        h2: "2. Ph? gi? xe m?y v? ? t? (Kho?n ph? c? ??nh h?ng th?ng)",
        ds: [
          "Xe m?y: th??ng dao ??ng 120.000 - 180.000?/xe/th?ng (m?i c?n th??ng b? gi?i h?n 2 xe m?y)",
          "? t?: t? 1.200.000 - 2.500.000?/th?ng (nhi?u chung c? trung t?m ?ang h?t ch? ??u ? t?, ph?i g?i b?i ngo?i ??t ??)",
          "H?i ch? nh? slot ??u ? t? c? ?i k?m c?n h? hay kh?ng tr??c khi k? c?c",
        ],
      },
      {
        h2: "3. Gi? ?i?n n??c t?i chung c?: Sinh ho?t hay th??ng m?i?",
        ds: [
          "Chung c? c? ??ng h? ?i?n n??c ri?ng theo ??n gi? nh? n??c EVN v? Sawaco",
          "Tuy nhi?n m?t s? d?ng c?n h? Officetel (v?n ph?ng k?t h?p l?u tr?) b? t?nh ??n gi? ?i?n n??c th??ng m?i cao h?n 20 - 30%",
          "H?i r? ch? nh? v? ??nh m?c s? ng??i s? d?ng ?? l?m vi?c v?i ??n v? c?p n??c nh?m h??ng gi? ?u ??i b?c thang",
        ],
      },
      {
        h2: "4. M?o th??ng l??ng ?? ch? nh? bao ph? qu?n l?",
        ds: [
          "N?u k? h?p ??ng t? 1 n?m tr? l?n v? thanh to?n 3 th?ng/l?n, h?y ?? xu?t ch? nh? h? tr? 100% ph? qu?n l?",
          "??a ?i?u kho?n ph? d?ch v? c? th? v?o ph? l?c h?p ??ng k?m m?c th?i gian ch?t ch? s? c?ng t?",
        ],
        lienKet: [
          { nhan: "Xem danh s?ch c?n h? cho thu?", href: "/search?deal=cho_thue" },
          { nhan: "So s?nh thu? nh? hay mua nh?", href: "/thue-hay-mua" },
        ],
      },
    ],
  },
  {
    slug: "nhung-dieu-khoan-bay-trong-hop-dong-thue-phong-tro",
    tieuDe: "Nh?ng ?i?u kho?n b?y trong h?p ??ng thu? ph?ng tr? v? m?u ?i?u kho?n b?o v? ng??i thu?",
    moTa: "Ch? ra 6 ?i?u kho?n g?i b?y tr? c?c ph? bi?n c?a ch? nh? tr?, quy ??nh th?i h?n b?o tr??c tr? ph?ng v? h??ng d?n ki?m tra bi?n b?n b?n giao t?i s?n.",
    ngay: "2026-10-27",
    category: "phap_ly",
    categoryName: "Ph?p l? & Quy ho?ch",
    readTime: "6 ph?t",
    coverImage: "https://images.unsplash.com/photo-1450133064473-71024230f91b?w=800&auto=format&fit=crop&q=80",
    muc: [
      {
        h2: "1. B?y 'T? ? t?ng gi? ph?ng sau 6 th?ng'",
        ds: [
          "Nhi?u ch? nh? ??a ?i?u kho?n: 'Ch? nh? c? quy?n ?i?u ch?nh gi? thu? theo bi?n ??ng th? tr??ng sau 6 th?ng'",
          "C?ch kh?c ph?c: Th?m ?i?u kho?n 'Gi? thu? c? ??nh trong to?n b? th?i h?n h?p ??ng (t?i thi?u 12 th?ng) kh?ng ???c thay ??i'",
        ],
      },
      {
        h2: "2. B?y th?i h?n th?ng b?o tr? ph?ng ?? giam c?c",
        ds: [
          "G?i ?i?u kho?n y?u c?u b?o tr??c 30 ho?c 45 ng?y b?ng v?n b?n, n?u b?o qua tin nh?n s? kh?ng ???c t?nh",
          "Y?u c?u ghi r? trong h?p ??ng: 'Ng??i thu? b?o tr??c 30 ng?y qua tin nh?n Zalo ho?c SMS ??n s? ?i?n tho?i ch? nh? l? h?p l?'",
        ],
      },
      {
        h2: "3. M?p m? trong bi?n b?n b?n giao hi?n tr?ng t?i s?n",
        ds: [
          "T??ng ?, v?i n??c r? s?t, ?i?u h?a k?u to t? tr??c nh?ng kh?ng ghi nh?n trong bi?n b?n",
          "Khi tr? ph?ng ch? nh? b?t ph?t ti?n s?n l?i to?n b? ph?ng v? thay m?i ?? ??c",
          "Gi?i ph?p: Ng?y ??u nh?n ph?ng, quay video 4K t?ng ng?c ng?ch, ch?p c?n c?nh c?c v?t x??c v? g?i ngay v?o nh?m Zalo chung v?i ch? nh? l?m b?ng ch?ng",
        ],
      },
      {
        h2: "4. ?i?u kho?n v?ng b?o v? 100% ti?n c?c",
        ds: [
          "B? sung c?u: 'Ch? nh? cam k?t ho?n tr? 100% ti?n c?c ngay trong ng?y b?n giao ph?ng n?u ng??i thu? ?? thanh to?n ?? ti?n ?i?n n??c v? b?o tr??c ?? 30 ng?y'",
          "Quy ??nh r? th?i gian ho?n c?c t?i ?a kh?ng qu? 3 ng?y l?m vi?c",
        ],
        lienKet: [
          { nhan: "Checklist 20 th? c?n xem ph?ng tr?", href: "/tin-tuc/checklist-xem-phong-tro" },
          { nhan: "Ph?ng tr? x?c minh t?i TP.HCM", href: "/search?deal=cho_thue" },
        ],
      },
    ],
  },
  {
    slug: "co-nen-mua-nha-so-chung-vi-bang-gia-re",
    tieuDe: "C? n?n mua nh? s? chung, vi b?ng gi? r?? Ph?n t?ch r?i ro ph?p l? v? gi?i ph?p b?o to?n v?n",
    moTa: "S? th?t v? nh? ??t b?n gi?y tay, vi b?ng th?a ph?t l?i. V? sao gi? ch? b?ng 50% th? tr??ng v? nh?ng r?i ro tranh ch?p, m?t tr?ng kh?ng th? l??ng tr??c.",
    ngay: "2026-10-28",
    category: "phap_ly",
    categoryName: "Ph?p l? & Quy ho?ch",
    readTime: "7 ph?t",
    coverImage: "https://images.unsplash.com/photo-1582407947304-fd86f028f716?w=800&auto=format&fit=crop&q=80",
    muc: [
      {
        h2: "1. B?n ch?t ph?p l? c?a Vi b?ng Th?a ph?t l?i",
        ds: [
          "Vi b?ng ch? ghi nh?n h?nh vi giao nh?n ti?n gi?a hai b?n t?i m?t th?i ?i?m, ho?n to?n KH?NG c? gi? tr? thay th? h?p ??ng c?ng ch?ng chuy?n nh??ng quy?n s? d?ng ??t",
          "B? T? ph?p ?? nhi?u l?n c?nh b?o c?m th?a ph?t l?i l?p vi b?ng nh?m m?c ??ch h?p th?c h?a vi?c mua b?n nh? ??t kh?ng ?? ?i?u ki?n",
        ],
      },
      {
        h2: "2. Ba r?i ro ch?t ng??i khi mua nh? vi b?ng, s? chung",
        ds: [
          "M?t ??ng s? h?u b? m?t ?em to?n b? s? g?c ?i th? ch?p ng?n h?ng ho?c vay n?ng x? h?i ?en: nh? b?n c? nguy c? b? si?t n? ph?t m?i b?t c? l?c n?o",
          "Kh?ng th? xin ph?p x?y d?ng, c?i t?o, n?ng t?ng: n?u c?n nh? xu?ng c?p b?n ch? c? th? s?a ch?p v? l?n l?t",
          "Khi m?t trong c?c ??ng s? h?u qua ??i, t?i s?n r?i v?o tranh ch?p th?a k? ph?c t?p gi?a nhi?u th? h?, kh?ng ai c? th? ??ng ra k? gi?y t?",
        ],
      },
      {
        h2: "3. L?i khuy?n thi?t th?c cho ng??i c? v?n ?t",
        ds: [
          "V?i t?m t?i ch?nh d??i 1.5 t? t?i TP.HCM, tuy?t ??i kh?ng n?n d?n to?n b? ti?n ti?t ki?m v?o nh? vi b?ng h?m nh? ngo?i th?nh",
          "Gi?i ph?p th?ng minh: D?ng s? v?n ?? g?i ti?t ki?m ho?c ??u t? k?nh an to?n, tr?ch ti?n l?i ?? thu? m?t c?n h?/nh? ph? khang trang, v?a c? m?i tr??ng s?ng t?t v?a kh?ng lo m?t v?n",
        ],
        lienKet: [
          { nhan: "10 b??c ki?m tra quy ho?ch & ph?p l?", href: "/tin-tuc/kiem-tra-phap-ly-quy-hoach-mua-nha-dat" },
          { nhan: "T?nh to?n thu? nh? hay mua nh?", href: "/thue-hay-mua" },
        ],
      },
    ],
  },
  {
    slug: "thu-tuc-vay-mua-nha-tra-gop-ngan-hang-2026",
    tieuDe: "H? s? v? th? t?c vay mua nh? tr? g?p ng?n h?ng: Ng??i c? thu nh?p t? do c?n chu?n b? g??",
    moTa: "H??ng d?n tr?n g?i quy tr?nh vay v?n ng?n h?ng mua nh?: c?ch ch?ng minh t?i ch?nh cho d?n t? do (freelancer, bu?n b?n nh?), ch?n g?i l?i su?t ?u ??i v? tr?nh ph? ph?t tr? tr??c h?n.",
    ngay: "2026-10-29",
    category: "tai_chinh",
    categoryName: "T?i ch?nh & L?i su?t",
    readTime: "6 ph?t",
    coverImage: "https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?w=800&auto=format&fit=crop&q=80",
    muc: [
      {
        h2: "1. Ki?m tra l?ch s? t?n d?ng CIC: Y?u t? s?ng c?n",
        ds: [
          "Tuy?t ??i kh?ng ?? d?nh n? nh?m 2 (ch?m tr? t? 10 - 30 ng?y) v? n? x?u nh?m 3 tr? l?n",
          "Ki?m tra k? c?c kho?n tr? g?p th? t?n d?ng, v? ?i?n t? mua tr??c tr? sau v? ch?ng l?m gi?m ??ng k? h?n m?c vay t?i ?a c?a b?n",
        ],
      },
      {
        h2: "2. C?ch ch?ng minh thu nh?p cho ng??i l?m t? do & ti?u th??ng",
        ds: [
          "Sao k? t?i kho?n ng?n h?ng trong 6 - 12 th?ng li?n t?c th? hi?n d?ng ti?n v?o ??u ??n m?i th?ng",
          "H?p ??ng cung c?p d?ch v?, h?p ??ng h?p t?c kinh doanh, h?a ??n b?n h?ng ho?c bi?n lai chuy?n ti?n t? ??i t?c",
          "H?p ??ng cho thu? t?i s?n s?n c? (n?u c? xe ? t?, ??t n?ng nghi?p ho?c ph?ng tr? cho thu? kh?c)",
        ],
      },
      {
        h2: "3. Th?m ??nh gi? t?i s?n: Ng?n h?ng cho vay bao nhi?u?",
        ds: [
          "Ng?n h?ng th??ng ch? ??nh gi? t?i s?n b?ng 80 - 85% gi? th? tr??ng th?c t?",
          "M?c cho vay t?i ?a th?ng th??ng l? 70% gi? tr? ??nh gi? c?a ng?n h?ng (t?c l? kho?ng 55 - 60% s? ti?n th?c t? b?n mua c?n nh?)",
          "V? d?: Nh? mua 3 t?, ng?n h?ng ??nh gi? 2.5 t? -> H?n m?c vay t?i ?a kho?ng 1.75 t?. B?n c?n chu?n b? s?n ?t nh?t 1.25 t? ti?n v?n ??i ?ng",
        ],
        lienKet: [
          { nhan: "B?ng t?nh l?i su?t vay mua nh?", href: "/tinh-lai-vay" },
          { nhan: "B?ng so s?nh l?i su?t c?c ng?n h?ng", href: "/tin-tuc/bang-lai-suat-vay-mua-nha-cac-ngan-hang" },
        ],
      },
      {
        h2: "4. Quy t?c an to?n 40% thu nh?p h?ng th?ng",
        ds: [
          "T?ng s? ti?n g?c + l?i ph?i tr? h?ng th?ng kh?ng bao gi? ???c v??t qu? 40% t?ng thu nh?p r?ng c?a gia ??nh",
          "Lu?n chu?n b? s?n m?t qu? d? ph?ng t??ng ???ng 6 th?ng ti?n sinh ho?t v? tr? n? ?? ph?ng r?i ro m?t vi?c ho?c ?m ?au",
        ],
      },
    ],
  },
  {
    slug: "cach-nhan-biet-tin-dang-nha-dat-ao-moi-gioi-lua-dao",
    tieuDe: "6 d?u hi?u nh?n bi?t tin ??ng nh? ??t ?o, m?i gi?i d?t m?i ?i xem ??t t?nh",
    moTa: "C?nh gi?c chi?u tr? ??ng nh? trung t?m S?i G?n gi? r? b?t ng? ?? l?a kh?ch l?n xe ch? ?i Long An, ??ng Nai. D?u hi?u s? ?i?n tho?i ?o v? ?nh copy tr?n m?ng.",
    ngay: "2026-10-30",
    category: "mua_ban",
    categoryName: "Kinh nghi?m mua b?n",
    readTime: "5 ph?t",
    coverImage: "https://images.unsplash.com/photo-1570129477492-45c003edd2be?w=800&auto=format&fit=crop&q=80",
    muc: [
      {
        h2: "1. Gi? r? b?t th??ng: C?n nh? ??p lung linh ? B?nh Th?nh gi? 1.8 t?",
        ds: [
          "H?nh ?nh nh? 3 t?ng khang trang, n?i th?t cao c?p nh?ng rao gi? ch? b?ng 30% m?t b?ng chung",
          "K?m c?c d?ng ch? t?o t?nh c?p b?ch: 'Ch? v? n? b?n g?p tr??c 12h tr?a', 'Ng?n h?ng ph?t m?i thanh l? gi? r?'",
        ],
      },
      {
        h2: "2. K?ch b?n 'C?n n?y v?a c? ng??i ??t c?c, em d?n ?i xem c?n kh?c ??p h?n'",
        ds: [
          "Khi b?n g?i ?i?n tho?i ho?c ??n ?i?m h?n, m?i gi?i s? b?o c?n nh? ??ng m?ng v?a b?n xong 15 ph?t tr??c",
          "Sau ?? ch?o k?o b?n l?n xe ? t? 7 ch? ho?c 16 ch? ?? ?i xem 'd? ?n ??t n?n ti?m n?ng ven ??'",
        ],
      },
      {
        h2: "3. Chi?u tr? b?y kh?ch l?n xe ?i Long An, ??ng Nai, B?nh D??ng",
        ds: [
          "?i?m h?n th??ng l? c?y x?ng, qu?n cafe ? c?a ng? th?nh ph? (Qu?c l? 13, Ng? t? An S??ng, B?n xe Mi?n ??ng)",
          "Tr?n xe lu?n c? s?n 'chim m?i' li?n t?c ch?t c?c ti?n m?t gi? t?o kh?ng kh? khan hi?m ?? k?ch th?ch b?n xu?ng ti?n",
        ],
      },
      {
        h2: "4. C?ch ph?ng tr?nh v? t? b?o v? m?nh",
        ds: [
          "Ki?n quy?t kh?ng l?n xe l? c?a m?i gi?i: lu?n y?u c?u ??nh v? ch?nh x?c v? tr? c?n nh? tr?n Google Maps tr??c khi di chuy?n",
          "S? d?ng Radar Nh? ??t ?? tra c?u gi? trung v? khu v?c: m?i tin ??ng r? h?n 40% gi? trung v? ??u ti?m ?n 99% r?i ro l?a ??o ho?c ?o",
          "Ki?m tra s? ?i?n tho?i ng??i ??ng tr?n Google ho?c Zalo: m?i gi?i uy t?n lu?n c? th?ng tin trang c? nh?n r? r?ng",
        ],
        lienKet: [
          { nhan: "Tra c?u gi? trung v? khu v?c", href: "/thong-ke" },
          { nhan: "Kinh nghi?m mua nh? h?m TP.HCM", href: "/tin-tuc/kinh-nghiem-mua-nha-hem-tphcm" },
        ],
      },
    ],
  },
  {
    slug: "kinh-nghiem-o-ghep-tim-ban-cung-phong-tphcm",
    tieuDe: "Kinh nghi?m t?m b?n ? gh?p TP.HCM: Quy t?c chia ti?n, b?o v? t?i s?n v? sinh ho?t chung",
    moTa: "B? quy?t ? gh?p kh?ng lo x?ch m?ch: c?ch ph?ng v?n b?n c?ng ph?ng, b?ng ph?n chia chi ph? c?ng b?ng, n?i quy kh?ch ??n ch?i v? b?o v? ?? ??c c? nh?n.",
    ngay: "2026-10-31",
    category: "thue_nha",
    categoryName: "C?m nang thu? ph?ng",
    readTime: "5 ph?t",
    coverImage: "https://images.unsplash.com/photo-1529156069898-49953e39b3ac?w=800&auto=format&fit=crop&q=80",
    muc: [
      {
        h2: "1. 5 c?u h?i ph?ng v?n tr??c khi g?t ??u ? chung",
        ds: [
          "Gi? gi?c sinh ho?t: B?n l? ng??i d?y s?m hay th?c khuya l?m ??m? C? th??ng xuy?n b?t ??n ho?c g?i ?i?n trong ph?ng l?c n?a ??m kh?ng?",
          "Kh? n?ng t?i ch?nh v? ngh? nghi?p ?n ??nh: Ngu?n ti?n tr? ph?ng h?ng th?ng ??n t? ??u, c? nguy c? tr? h?n ??ng ti?n kh?ng?",
          "Th?i quen h?t thu?c, u?ng r??u bia, nu?i th? c?ng trong ph?ng k?n",
        ],
      },
      {
        h2: "2. Quy t?c chia chi ph? c?ng b?ng v? minh b?ch",
        ds: [
          "Ti?n ph?ng chia ??u theo ??u ng??i",
          "Ti?n ?i?n: N?u c? b?n d?ng m?y t?nh ?? b?n (PC c?u h?nh cao) ch?y 24/7 ho?c d?ng n?i chi?n kh?ng d?u li?n t?c th? n?n th?a thu?n ??ng th?m ti?n ?i?n so v?i ng??i ch? d?ng laptop",
          "Chi ph? ?? d?ng chung (d?u ?n, m?m mu?i, n??c r?a ch?n, gi?y v? sinh, t?i r?c): L?p m?t qu? chung m?i ng??i ??ng 100.000?/th?ng",
        ],
      },
      {
        h2: "3. Quy ??nh kh?ch ngo?i v? b?n b? ??n ng? l?i",
        ds: [
          "Ph?i xin ph?p v? ???c s? ??ng ? c?a t?t c? th?nh vi?n trong ph?ng tr??c khi m?i ng??i l? v? nh?",
          "N?u c? ng??i ? l?i qua ??m qu? 2 ng?y trong tu?n, b?t bu?c ph?i ph? ??ng th?m ti?n ?i?n n??c sinh ho?t",
          "T?n tr?ng kh?ng gian ri?ng t?: tuy?t ??i kh?ng d?n ng??i y?u v? sinh ho?t khi b?n c?ng ph?ng ?ang c? m?t",
        ],
      },
      {
        h2: "4. B?n th?a thu?n n?i b? khi m?t ng??i mu?n chuy?n ?i",
        ds: [
          "B?t bu?c b?o tr??c cho c? ph?ng ?t nh?t 30 ng?y ?? c?ng ??ng b?i t?m ng??i thay th?",
          "N?u chuy?n ?i ??t ng?t m? kh?ng t?m ???c ng??i b? v?o, ng??i r?i ?i s? ph?i ch?u tr?ch nhi?m thanh to?n ph?n ti?n ph?ng c?a m?nh cho th?ng ?? ?? b?o to?n ti?n c?c cho ng??i ? l?i",
        ],
        lienKet: [
          { nhan: "Kinh nghi?m thu? ph?ng tr?nh m?t c?c", href: "/tin-tuc/kinh-nghiem-thue-phong-tro-tphcm-tranh-mat-coc" },
          { nhan: "Thu? ph?ng g?n c?c tr??ng ??i h?c", href: "/tin-tuc/thue-phong-tro-gan-dai-hoc-tphcm" },
        ],
      },
    ],
  },
  {
    slug: "thu-tuc-sang-ten-so-do-cho-tang-thua-ke",
    tieuDe: "Th? t?c sang t?n s? ?? khi b? m? cho t?ng ho?c th?a k?: Thu? ph? v? c?c b??c th?c hi?n",
    moTa: "H??ng d?n chi ti?t th? t?c nh?n chuy?n nh??ng, t?ng cho nh? ??t trong gia ??nh: ?i?u ki?n mi?n thu? TNCN, h? s? c?ng ch?ng v? c?c b??c ??ng b? sang t?n s? h?ng.",
    ngay: "2026-11-01",
    category: "phap_ly",
    categoryName: "Ph?p l? & Quy ho?ch",
    readTime: "6 ph?t",
    coverImage: "https://images.unsplash.com/photo-1568605117036-5fe5e7bab0b7?w=800&auto=format&fit=crop&q=80",
    muc: [
      {
        h2: "1. ?i?u ki?n ???c mi?n thu? TNCN v? L? ph? tr??c b?",
        ds: [
          "Theo Lu?t Thu? Thu nh?p c? nh?n, giao d?ch t?ng cho, th?a k? b?t ??ng s?n gi?a: V? v?i ch?ng; Cha ??, m? ?? v?i con ??; Cha nu?i, m? nu?i v?i con nu?i; ?ng b? n?i, ?ng b? ngo?i v?i ch?u n?i, ch?u ngo?i; Anh ch? em ru?t v?i nhau ??U ???C MI?N 100% THU? TNCN",
          "??ng th?i ???c MI?N 100% L? PH? TR??C B? khi l?m th? t?c sang t?n ??i ch?",
        ],
      },
      {
        h2: "2. H? s? c?n chu?n b? ?i c?ng ch?ng h?p ??ng cho t?ng",
        ds: [
          "Gi?y ch?ng nh?n quy?n s? d?ng ??t, quy?n s? h?u nh? ? (S? h?ng/S? ?? b?n g?c)",
          "C?n c??c c?ng d?n g?n chip c?a b?n cho v? b?n nh?n",
          "Gi?y t? ch?ng minh quan h? ru?t th?t: Gi?y khai sinh, Tr?ch l?c khai sinh, ho?c S? h? kh?u c?",
          "Gi?y ??ng k? k?t h?n c?a b? m? ho?c Gi?y x?c nh?n t?nh tr?ng h?n nh?n",
        ],
      },
      {
        h2: "3. Quy tr?nh n?p h? s? ??ng b? t?i V?n ph?ng ??ng k? ??t ?ai",
        ds: [
          "B??c 1: N?p h? s? t?i B? ph?n M?t c?a chi nh?nh V?n ph?ng ??ng k? ??t ?ai c?p qu?n/huy?n n?i c? ??t",
          "B??c 2: C? quan thu? ph?t h?nh th?ng b?o mi?n thu? trong v?ng 3 - 5 ng?y l?m vi?c",
          "B??c 3: Nh?n s? m?i ?? c?p nh?t t?n ng??i ???c t?ng cho ? trang 4 ho?c c?p ??i s? h?ng m?i (th?i gian th??ng t? 10 - 15 ng?y)",
        ],
        lienKet: [
          { nhan: "Quy tr?nh c?ng ch?ng sang t?n t? A - Z", href: "/tin-tuc/quy-trinh-cong-chung-sang-ten-so-hong-a-z" },
          { nhan: "Ki?m tra ph?p l? quy ho?ch nh? ??t", href: "/tin-tuc/kiem-tra-phap-ly-quy-hoach-mua-nha-dat" },
        ],
      },
    ],
  },
  {
    slug: "tieu-chi-chon-phong-tro-an-ninh-tphcm",
    tieuDe: "C?ch ki?m tra an ninh v? an to?n ph?ng ch?y ch?a ch?y c?a khu tr? tr??c khi xu?ng c?c",
    moTa: "B? quy?t th?m ??nh ?? an to?n c?a nh? tr?: l?i tho?t hi?m th? 2, h? th?ng PCCC, b?i ?? xe s?c ?i?n, kh?a v?n tay v? camera gi?m s?t h?nh lang.",
    ngay: "2026-11-01",
    category: "thue_nha",
    categoryName: "C?m nang thu? ph?ng",
    readTime: "5 ph?t",
    coverImage: "https://images.unsplash.com/photo-1512917774080-9991f1c4c750?w=800&auto=format&fit=crop&q=80",
    muc: [
      {
        h2: "1. Ti?u chu?n an to?n PCCC b?t bu?c ph?i ki?m tra",
        ds: [
          "C? ?t nh?t 2 l?i tho?t hi?m: ngo?i c?u thang b? ch?nh ph?i c? thang s?t tho?t hi?m ngo?i tr?i ho?c l?i m? tho?t qua ban c?ng/s?n th??ng sang nh? b?n c?nh",
          "H?nh lang c?c t?ng v? khu nh? xe ph?i trang b? b?nh ch?a ch?y b?t/kh? CO2 c?n h?n s? d?ng (??ng h? ?p su?t v?ch xanh)",
          "C?a ph?ng v? c?a ban c?ng kh?ng b? h?n k?n 'chu?ng c?p' kh?ng c? c?a tho?t n?n",
        ],
      },
      {
        h2: "2. Quy ??nh an to?n t?i h?m xe v? tr?m s?c xe m?y ?i?n",
        ds: [
          "Khu ?? xe m?y ?i?n ph?i c? khu v?c s?c ri?ng bi?t, c? r? le t? ng?t khi ch?p ?i?n ho?c s?c ??y",
          "Kho?ng c?ch gi?a c?c h?ng xe ?? r?ng ?? s? t?n kh?n c?p, kh?ng ?? xe b?t k?n l?i ra c?a ch?nh",
        ],
      },
      {
        h2: "3. H? th?ng an ninh v? ki?m so?t ng??i l?",
        ds: [
          "C?ng ch?nh s? d?ng kh?a v?n tay th?ng minh ho?c th? t? c? ghi nh?n l?ch s? ra v?o",
          "Camera gi?m s?t 24/7 l?p ??t ?: c?ng ra v?o, to?n b? nh? xe v? h?nh lang m?i t?ng",
          "??n chi?u s?ng h?nh lang ban ??m ph?i lu?n b?t s?ng, kh?ng c? g?c khu?t t?m t?i",
        ],
      },
      {
        h2: "4. Kh?o s?t m?i tr??ng x? h?i xung quanh con h?m",
        ds: [
          "?i xem ph?ng v?o 2 khung gi? kh?c nhau: m?t l?n v?o ban ng?y v? m?t l?n v?o kho?ng 20h - 21h t?i",
          "Quan s?t con h?m c? t? t?p c? b?c, h?t karaoke ?n ?o ho?c thi?u ??n ???ng hay kh?ng",
        ],
        lienKet: [
          { nhan: "Ph?ng tr? an ninh, c? video th?c t?", href: "/search?deal=cho_thue" },
          { nhan: "Ph?n bi?t Studio, Duplex, G?c l?ng", href: "/tin-tuc/studio-gac-lung-duplex-khac-nhau-the-nao" },
        ],
      },
    ],
  },
  {
    slug: "cach-tinh-thue-thu-nhap-ca-nhan-khi-ban-nha-dat",
    tieuDe: "C?ch t?nh thu? TNCN v? l? ph? tr??c b? khi mua b?n nh? ??t: Ai ph?i tr? kho?n n?o?",
    moTa: "Chi ti?t m?c thu? 2% thu? thu nh?p c? nh?n, 0.5% l? ph? tr??c b?, ph? c?ng ch?ng khi chuy?n nh??ng b?t ??ng s?n. H??ng d?n h? s? xin mi?n thu? ??i v?i c?n nh? duy nh?t.",
    ngay: "2026-11-01",
    category: "tai_chinh",
    categoryName: "T?i ch?nh & L?i su?t",
    readTime: "6 ph?t",
    coverImage: "https://images.unsplash.com/photo-1551836022-d5d88e9218df?w=800&auto=format&fit=crop&q=80",
    muc: [
      {
        h2: "1. Ai ph?i n?p kho?n thu? ph? n?o theo quy ??nh ph?p lu?t?",
        ds: [
          "B?n B?n: Ch?u Thu? thu nh?p c? nh?n (TNCN) l? 2% t?nh tr?n t?ng gi? tr? chuy?n nh??ng ghi trong h?p ??ng",
          "B?n Mua: Ch?u L? ph? tr??c b? l? 0.5% t?nh tr?n gi? tr? t?i s?n t?nh l? ph? tr??c b? c?a Nh? n??c ban h?nh (ho?c gi? h?p ??ng n?u cao h?n)",
          "L?u ?: Hai b?n ho?n to?n c? quy?n t? th?a thu?n v?i nhau v? vi?c ai l? ng??i thanh to?n to?n b? c?c kho?n thu? ph? n?y (th??ng ghi 'gi? b?n bao tr?n g?i thu? ph?' ho?c 'b?n mua t? ch?u h?t')",
        ],
      },
      {
        h2: "2. Ph? c?ng ch?ng v? th? lao c?ng ch?ng t?nh th? n?o?",
        ds: [
          "Ph? c?ng ch?ng t?nh theo Th?ng t? li?n t?ch c?a B? T? ph?p v? B? T?i ch?nh d?a tr?n gi? tr? h?p ??ng:",
          "T? 1 t? ??n 3 t?: 1 tri?u ??ng + 0.06% c?a ph?n gi? tr? t?i s?n v??t qu? 1 t?",
          "T? 3 t? ??n 5 t?: 2.2 tri?u ??ng + 0.05% c?a ph?n gi? tr? t?i s?n v??t qu? 3 t?",
          "Kho?n n?y th??ng do b?n mua thanh to?n ho?c chia ??i 50/50 theo th?ng l? th? tr??ng",
        ],
      },
      {
        h2: "3. ?i?u ki?n xin mi?n 100% thu? TNCN khi b?n c?n nh? duy nh?t",
        ds: [
          "T?i th?i ?i?m chuy?n nh??ng, ng??i b?n ch? c? duy nh?t quy?n s? h?u m?t nh? ? ho?c quy?n s? d?ng m?t th?a ??t tr?n to?n l?nh th? Vi?t Nam",
          "Th?i gian s? h?u nh? ?/??t ? t?nh ??n th?i ?i?m chuy?n nh??ng t?i thi?u t? 183 ng?y tr? l?n",
          "Ph?i chuy?n nh??ng to?n b? nh? ?, ??t ? (chuy?n nh??ng m?t ph?n s? kh?ng ???c mi?n thu?)",
        ],
      },
      {
        h2: "4. C?nh b?o r?i ro khi 'khai hai gi?' ?? n? thu?",
        ds: [
          "K? khai gi? tr?n h?p ??ng c?ng ch?ng th?p h?n nhi?u so v?i gi? tr? giao d?ch th?c t? ?? tr?n thu? l? h?nh vi vi ph?m ph?p lu?t nghi?m tr?ng",
          "N?u b? c? quan thu? truy thu ho?c x?y ra tranh ch?p h?y h?p ??ng, t?a ?n s? ch? b?o v? s? ti?n ghi tr?n h?p ??ng c?ng ch?ng, ng??i mua c? nguy c? m?t to?n b? kho?n ti?n ch?nh l?ch ngo?i h?p ??ng",
        ],
        lienKet: [
          { nhan: "Quy tr?nh c?ng ch?ng sang t?n s? h?ng", href: "/tin-tuc/quy-trinh-cong-chung-sang-ten-so-hong-a-z" },
          { nhan: "C?ng c? ??nh gi? nh? ??t chu?n x?c", href: "/dinh-gia" },
        ],
      },
    ],
  },
];
