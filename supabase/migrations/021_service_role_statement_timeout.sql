-- 021 (23/8): seed CI chết "canceling statement due to statement timeout" khi DB chạm 13k
-- tin - trần mặc định 8s của các role API quá chật cho upsert theo lô (daily.mjs cũng đã
-- giảm nhịp update 200 -> 50). Nới CHỈ cho service_role (pipeline dùng); anon/authenticated
-- giữ 8s để query web lỗi không treo cả trang.
alter role service_role set statement_timeout = '120s';
notify pgrst, 'reload config';
