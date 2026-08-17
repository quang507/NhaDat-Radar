// Danh sách cột của bảng `listings` dùng cho .select() — MỌI CỘT TRỪ `embedding`.
//
// Sự cố 17/8 (đo trên bản deploy thật): /search có TTFB 176ms nhưng HTML mất 6.376ms mới tải xong.
// Thủ phạm: các trang dùng .select("*"), mà migration 003 thêm cột `embedding vector(768)` cho tìm
// kiếm ngữ nghĩa. PostgREST trả vector đó dưới dạng text (~15KB/dòng); /search lấy 200 tin và 51%
// số tin đã có embedding -> ~1.5MB dữ liệu vô ích kéo từ Supabase (Tokyo) về Vercel mỗi lần tải
// trang, và sẽ thành ~2.9MB khi embed.mjs chạy xong. KHÔNG trang nào dùng tới cột này — tìm kiếm
// ngữ nghĩa đi qua RPC match_listings, chỉ trả về id.
//
// ⚠ PHẢI viết thành MỘT chuỗi literal liền (không dùng [].join(",") cũng không nối bằng "+"):
// supabase-js suy kiểu kết quả từ kiểu literal của tham số select(); nếu là `string` thường thì
// kết quả ra GenericStringError[] và typecheck fail.
// Khi thêm cột mới vào bảng listings thì thêm vào đây.
export const LISTING_COLS = "id,source,source_site,source_url,source_post_id,agent_id,project_id,deal,kind,title,description,price_vnd,area_m2,price_per_m2,bedrooms,bathrooms,floors,direction,legal_status,furnishing,province,district,ward,address,lat,lng,amenities,images,contact_name,contact_phone,phone_masked,ai_score,trust_score,poster_role_guess,poster_listing_count,poster_reasons,poster_key,price_flag,source_count,source_sites,status,posted_at,first_seen_at,last_seen_at,crawled_at,crawl_count,created_at";

// Bản GỌN cho danh sách/thẻ tin (trang chủ, /search, tin liên quan): bỏ các cột chỉ trang chi tiết
// mới cần. /search tải 200 tin nên mỗi cột thừa đều nhân lên 200 lần.
export const LISTING_CARD_COLS = "id,source,source_site,source_url,deal,kind,title,description,price_vnd,area_m2,price_per_m2,bedrooms,bathrooms,province,district,ward,lat,lng,images,ai_score,trust_score,poster_role_guess,price_flag,status,posted_at,first_seen_at,last_seen_at,created_at";
