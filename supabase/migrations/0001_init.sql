-- 0001_init.sql
-- Bảng cơ bản: Thuốc, Lịch uống, Nhật ký uống thuốc
-- Bật RLS toàn bộ; chỉ role authenticated mới được truy cập theo user_id.

-- 1. Bảng Thuốc (medications)
create table if not exists public.medications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  name text not null,
  dosage text,                       -- ví dụ "500mg - 1 viên"
  notes text,
  color text,                        -- mã màu hoặc tên màu hiển thị
  stock numeric,                     -- số lượng còn lại
  low_stock_threshold numeric,       -- ngưỡng cảnh báo sắp hết
  start_date date,
  end_date date,                     -- null = uống dài hạn
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 2. Bảng Lịch uống (schedules): mỗi dòng = 1 giờ uống của 1 thuốc
create table if not exists public.schedules (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  medication_id uuid not null references public.medications(id) on delete cascade,
  time_of_day time not null,                                   -- ví dụ "08:00"
  days_of_week smallint[] not null default '{1,2,3,4,5,6,7}',  -- 1=Thứ 2 ... 7=CN
  dose_amount numeric default 1,                               -- số viên mỗi lần
  enabled boolean not null default true,
  created_at timestamptz not null default now()
);

-- 3. Bảng Nhật ký uống thuốc (dose_logs)
create table if not exists public.dose_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  medication_id uuid not null references public.medications(id) on delete cascade,
  schedule_id uuid references public.schedules(id) on delete set null,
  scheduled_at timestamptz not null,                           -- thời điểm lẽ ra phải uống
  taken_at timestamptz,                                        -- thời điểm thực tế bấm đã uống
  status text not null check (status in ('taken','skipped','missed')),
  created_at timestamptz not null default now(),
  unique (schedule_id, scheduled_at)                           -- tránh ghi trùng
);

-- Chỉ mục tối ưu truy vấn
create index if not exists idx_schedules_user_med on public.schedules (user_id, medication_id);
create index if not exists idx_dose_logs_user_scheduled on public.dose_logs (user_id, scheduled_at desc);

-- BẬT ROW LEVEL SECURITY (RLS) - Bắt buộc
alter table public.medications enable row level security;
alter table public.schedules enable row level security;
alter table public.dose_logs enable row level security;

-- Policies: chỉ người sở hữu (authenticated) mới được xem / thêm / sửa / xoá
create policy "own medications" on public.medications
  for all to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

create policy "own schedules" on public.schedules
  for all to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

create policy "own dose_logs" on public.dose_logs
  for all to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

-- Hàm trigger tự động cập nhật updated_at
create or replace function public.touch_updated_at() returns trigger
language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists medications_touch on public.medications;
create trigger medications_touch before update on public.medications
  for each row execute function public.touch_updated_at();
