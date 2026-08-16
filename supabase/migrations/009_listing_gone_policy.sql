-- 009: trang chi tiết vẫn mở được tin crawl đã 'gone' (kèm nhãn "có thể đã giao dịch/gỡ").
-- Tách khỏi 008 vì Postgres không cho dùng giá trị enum vừa thêm trong cùng transaction.
-- search/home/chat/sitemap đều lọc status='published' phía app nên tin gone không lọt vào danh sách.
drop policy if exists "listings_read_public" on listings;
create policy "listings_read_public" on listings for select
  using (status = 'published'
         or (status = 'gone' and source = 'crawl')
         or agent_id = auth.uid()
         or exists (select 1 from profiles p where p.id = auth.uid() and p.role = 'admin'));
