-- ============================================================================
--  MIGRATION 002 - Lọc tin rác MẠNH HƠN (2026-08-14)
--  Xoá tin crawl không phải BĐS: dịch vụ thi công, tuyển dụng, vay vốn,
--  đồ điện tử/tiêu dùng, sim số... (danh sách khớp crawler/junk.mjs)
--  Chạy trong Supabase -> SQL Editor -> dán -> Run. An toàn chạy lại nhiều lần.
-- ============================================================================

delete from public.listings
where source = 'crawl'
  and (
    -- thiết bị điện / vật tư bán lẻ
    title ~* '(đèn (đường|led|năng lượng|pha|trụ)|công tắc|ổ cắm|thiết bị (điện|vệ sinh|nhà bếp|an ninh)|máy bơm|dây cáp)'
    -- dịch vụ thi công / quảng cáo dịch vụ
    or title ~* '(báo giá|(nhận|chuyên|dịch vụ) (thi công|lắp đặt|sửa chữa|sơn)|thi công trọn gói|khoan (giếng|cắt)|hút hầm|thông (cống|tắc)|diệt (mối|côn trùng|chuột)|chuyển (nhà|văn phòng) trọn gói|taxi tải|vệ sinh công nghiệp)'
    -- tuyển dụng / việc làm
    or title ~* '(tuyển (dụng|nhân viên|gấp|ctv|cộng tác)|cần tuyển|việc làm|tìm việc)'
    -- tài chính / vay
    or title ~* '(cho vay|vay (vốn|tiền|nhanh|online)|giải ngân|đáo hạn|hỗ trợ tài chính|bảo hiểm (nhân thọ|xe|sức khỏe))'
    -- hàng tiêu dùng không phải BĐS
    or title ~* '(sim số|iphone|macbook|laptop|máy giặt|tủ lạnh|máy lọc nước|camera (wifi|hành trình)|mỹ phẩm|nước hoa|quần áo|giày dép|thực phẩm chức năng|thanh lý (bàn ghế|đồ|kệ))'
    -- tiêu đề quá ngắn = rác
    or length(trim(title)) < 8
  );
