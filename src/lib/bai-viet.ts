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
];
