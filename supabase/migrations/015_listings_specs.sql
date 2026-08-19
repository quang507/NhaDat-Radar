-- Bảng thông số riêng của từng nguồn cho LISTINGS (013 chỉ thêm cột này cho projects).
--
-- Cột đã được áp TRỰC TIẾP lên DB ngày 19/8 (apply_migration "listings_specs" qua MCP) nhưng
-- quên lưu file vào repo — review 19/8 bắt được: môi trường nào dựng từ migrations sẽ thiếu
-- cột trong khi LISTING_COLS (src/lib/cols.ts) và seed daily.mjs đều đọc/ghi nó -> mọi
-- select(LISTING_COLS) trả 42703 và toàn bộ seed chết. File này để repo tự đủ.
alter table public.listings add column if not exists specs jsonb;
comment on column public.listings.specs is
  'Bảng thông số riêng của từng nguồn (guland: mặt tiền/chiều dài/hình dáng đất/loại sổ; batdongsan: hướng/năm xây/đường vào). Mỗi nguồn một bộ nhãn nên để jsonb, web chỉ hiện ô có giá trị.';
