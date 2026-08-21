-- 017 (21/8): first_seen_at chỉ được crawler set - tin tự đăng (dashboard), tin Zalo OA và
-- tin bot Zalo đều NULL. Hậu quả: không bao giờ vào email alert (alerts.mjs .gt(first_seen_at)),
-- rơi cuối sort "Mới nhất" (nullsFirst:false), không được đếm "N tin mới hôm nay".
-- Đặt default để đường insert nào quên cũng không tái phát, và bù các hàng đã NULL.
alter table listings alter column first_seen_at set default now();
update listings set first_seen_at = coalesce(created_at, now()) where first_seen_at is null;
