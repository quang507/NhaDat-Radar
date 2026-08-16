-- 012: dự án đối tác / Nhã Đạt xếp đầu (trang chủ + /projects). priority càng cao càng lên trước; is_partner để gắn nhãn.
alter table projects add column if not exists priority int not null default 0;
alter table projects add column if not exists is_partner boolean not null default false;
create index if not exists idx_projects_priority on projects(priority desc);
