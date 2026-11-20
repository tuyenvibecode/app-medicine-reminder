-- 0002: gia đình, danh mục thuốc, gợi ý thuốc, đơn thuốc, kho ảnh riêng tư
-- Chạy SAU 0001_init.sql (trong Supabase Dashboard -> SQL Editor).
-- Nguyên tắc: bảng nào cũng bật RLS; không có policy cho role anon.

-- ============ HỒ SƠ ============
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null default '',
  created_at timestamptz not null default now()
);

-- Thông tin sức khoẻ để riêng: chỉ chủ + dược sĩ cùng gia đình mới xem được
create table public.health_profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  allergies text,      -- dị ứng thuốc (nhập tay)
  health_notes text,   -- thai kỳ, bệnh nền... (nhập tay)
  updated_at timestamptz not null default now()
);

-- Tự tạo profile khi có tài khoản mới
create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, display_name)
  values (new.id, coalesce(new.raw_user_meta_data ->> 'display_name', ''))
  on conflict do nothing;
  return new;
end $$;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

-- ============ GIA ĐÌNH ============
create table public.households (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  created_by uuid not null default auth.uid() references auth.users(id),
  created_at timestamptz not null default now()
);

create table public.household_members (
  household_id uuid not null references public.households(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null check (role in ('patient', 'pharmacist')),
  joined_at timestamptz not null default now(),
  primary key (household_id, user_id)
);

-- Mã mời dùng 1 lần, hết hạn sau 24 giờ. Không có policy: chỉ truy cập qua hàm bên dưới.
create table public.household_invites (
  code text primary key,
  household_id uuid not null references public.households(id) on delete cascade,
  role text not null check (role in ('patient', 'pharmacist')),
  expires_at timestamptz not null,
  used_at timestamptz,
  created_by uuid not null references auth.users(id)
);

-- Hàm kiểm tra (security definer để tránh vòng lặp RLS)
create or replace function public.is_household_member(hid uuid) returns boolean
language sql security definer set search_path = public stable as $$
  select exists (select 1 from household_members
                 where household_id = hid and user_id = (select auth.uid()));
$$;

create or replace function public.is_household_pharmacist(hid uuid) returns boolean
language sql security definer set search_path = public stable as $$
  select exists (select 1 from household_members
                 where household_id = hid and user_id = (select auth.uid()) and role = 'pharmacist');
$$;

create or replace function public.shares_household(target uuid) returns boolean
language sql security definer set search_path = public stable as $$
  select exists (select 1 from household_members me
                 join household_members t on t.household_id = me.household_id
                 where me.user_id = (select auth.uid()) and t.user_id = target);
$$;

create or replace function public.shares_household_as_pharmacist(target uuid) returns boolean
language sql security definer set search_path = public stable as $$
  select exists (select 1 from household_members me
                 join household_members t on t.household_id = me.household_id
                 where me.user_id = (select auth.uid()) and me.role = 'pharmacist'
                   and t.user_id = target);
$$;

create or replace function public.create_household(p_name text) returns uuid
language plpgsql security definer set search_path = public as $$
declare hid uuid;
begin
  if auth.uid() is null then raise exception 'chưa đăng nhập'; end if;
  insert into households (name, created_by) values (p_name, auth.uid()) returning id into hid;
  insert into household_members (household_id, user_id, role) values (hid, auth.uid(), 'patient');
  return hid;
end $$;

create or replace function public.create_invite(p_household uuid, p_role text) returns text
language plpgsql security definer set search_path = public as $$
declare c text;
begin
  if not exists (select 1 from households where id = p_household and created_by = auth.uid()) then
    raise exception 'không có quyền tạo mã mời';
  end if;
  c := substr(replace(gen_random_uuid()::text, '-', ''), 1, 10);
  insert into household_invites (code, household_id, role, expires_at, created_by)
  values (c, p_household, p_role, now() + interval '24 hours', auth.uid());
  return c;
end $$;

create or replace function public.join_household(p_code text) returns uuid
language plpgsql security definer set search_path = public as $$
declare inv household_invites%rowtype;
begin
  if auth.uid() is null then raise exception 'chưa đăng nhập'; end if;
  select * into inv from household_invites
   where code = p_code and used_at is null and expires_at > now() for update;
  if not found then raise exception 'mã mời không hợp lệ hoặc đã hết hạn'; end if;
  insert into household_members (household_id, user_id, role)
  values (inv.household_id, auth.uid(), inv.role) on conflict do nothing;
  update household_invites set used_at = now() where code = p_code;
  return inv.household_id;
end $$;

-- Chỉ người đã đăng nhập mới gọi được các hàm
revoke all on function public.is_household_member(uuid), public.is_household_pharmacist(uuid),
  public.shares_household(uuid), public.shares_household_as_pharmacist(uuid),
  public.create_household(text), public.create_invite(uuid, text), public.join_household(text)
  from public, anon;
grant execute on function public.is_household_member(uuid), public.is_household_pharmacist(uuid),
  public.shares_household(uuid), public.shares_household_as_pharmacist(uuid),
  public.create_household(text), public.create_invite(uuid, text), public.join_household(text)
  to authenticated;

-- ============ DANH MỤC THUỐC (dược sĩ nhập và duyệt) ============
create table public.drug_catalog (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households(id) on delete cascade,
  created_by uuid not null default auth.uid() references auth.users(id),
  name text not null,
  active_ingredient text,
  strength text,
  form text,
  reg_number text,                 -- số đăng ký (VD-xxxx, VN-xxxx)
  usual_dose text,
  contraindications text,
  notes text,
  image_path text,                 -- đường dẫn trong bucket catalog-photos
  is_prescription_only boolean not null default false,
  verified_by uuid references auth.users(id),
  verified_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index on public.drug_catalog (household_id, name);

-- ============ GỢI Ý THUỐC TỪ DƯỢC SĨ GIA ĐÌNH ============
create table public.suggestions (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households(id) on delete cascade,
  patient_id uuid not null default auth.uid() references auth.users(id),
  pharmacist_id uuid references auth.users(id),
  symptoms text not null,
  symptom_image_path text,
  status text not null default 'requested'
    check (status in ('requested', 'suggested', 'accepted', 'declined')),
  pharmacist_note text,
  created_at timestamptz not null default now(),
  responded_at timestamptz
);
create index on public.suggestions (household_id, status, created_at desc);

create table public.suggestion_items (
  id uuid primary key default gen_random_uuid(),
  suggestion_id uuid not null references public.suggestions(id) on delete cascade,
  catalog_id uuid references public.drug_catalog(id) on delete set null,
  medicine_name text not null,     -- chụp lại tên tại thời điểm gợi ý
  dose text,
  times_per_day smallint,
  duration_days smallint,
  instructions text
);

-- Không cho sửa nội dung bệnh nhân đã gửi
create or replace function public.suggestions_guard() returns trigger
language plpgsql as $$
begin
  if new.patient_id <> old.patient_id or new.household_id <> old.household_id
     or new.symptoms <> old.symptoms then
    raise exception 'không được sửa thông tin yêu cầu';
  end if;
  return new;
end $$;
create trigger suggestions_guard_trg before update on public.suggestions
  for each row execute function public.suggestions_guard();

-- Chặn thuốc kê đơn trong gợi ý từ xa (rule 04-medical-safety)
create or replace function public.suggestion_items_guard() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if new.catalog_id is not null and exists (
       select 1 from drug_catalog where id = new.catalog_id and is_prescription_only) then
    raise exception 'Thuốc kê đơn không được đưa vào gợi ý từ xa';
  end if;
  return new;
end $$;
create trigger suggestion_items_guard_trg before insert or update on public.suggestion_items
  for each row execute function public.suggestion_items_guard();

-- ============ ĐƠN THUỐC CỦA RIÊNG TỪNG NGƯỜI ============
create table public.prescriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  condition text not null,         -- bệnh / lý do ("Cảm cúm", "Huyết áp"...)
  issued_on date,
  issuer text,                     -- bác sĩ / nhà thuốc
  photo_path text,                 -- ảnh toa trong bucket user-photos
  notes text,
  created_at timestamptz not null default now()
);
create index on public.prescriptions (user_id, issued_on desc);

create table public.prescription_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  prescription_id uuid not null references public.prescriptions(id) on delete cascade,
  medication_id uuid references public.medications(id) on delete set null,
  name text not null,
  dosage text,
  quantity text
);

-- Ảnh viên thuốc: thêm cột vào bảng thuốc ở 0001
alter table public.medications add column if not exists photo_path text;
alter table public.medications add column if not exists photo_frames text[]; -- xoay 360 (tuỳ chọn)

-- ============ BẬT RLS ============
alter table public.profiles            enable row level security;
alter table public.health_profiles     enable row level security;
alter table public.households          enable row level security;
alter table public.household_members   enable row level security;
alter table public.household_invites   enable row level security; -- không có policy
alter table public.drug_catalog        enable row level security;
alter table public.suggestions         enable row level security;
alter table public.suggestion_items    enable row level security;
alter table public.prescriptions       enable row level security;
alter table public.prescription_items  enable row level security;

-- ============ POLICY ============
create policy "profiles read" on public.profiles for select to authenticated
  using (id = (select auth.uid()) or public.shares_household(id));
create policy "profiles update own" on public.profiles for update to authenticated
  using (id = (select auth.uid())) with check (id = (select auth.uid()));

create policy "health read" on public.health_profiles for select to authenticated
  using (user_id = (select auth.uid()) or public.shares_household_as_pharmacist(user_id));
create policy "health write own" on public.health_profiles for all to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

create policy "households read" on public.households for select to authenticated
  using (public.is_household_member(id));

create policy "members read" on public.household_members for select to authenticated
  using (user_id = (select auth.uid()) or public.is_household_member(household_id));

create policy "catalog read" on public.drug_catalog for select to authenticated
  using (public.is_household_member(household_id));
create policy "catalog insert" on public.drug_catalog for insert to authenticated
  with check (public.is_household_pharmacist(household_id) and created_by = (select auth.uid()));
create policy "catalog update" on public.drug_catalog for update to authenticated
  using (public.is_household_pharmacist(household_id))
  with check (public.is_household_pharmacist(household_id));
create policy "catalog delete" on public.drug_catalog for delete to authenticated
  using (public.is_household_pharmacist(household_id));

create policy "suggestions read" on public.suggestions for select to authenticated
  using (patient_id = (select auth.uid()) or public.is_household_pharmacist(household_id));
create policy "suggestions insert by patient" on public.suggestions for insert to authenticated
  with check (patient_id = (select auth.uid()) and public.is_household_member(household_id)
              and status = 'requested');
create policy "suggestions update pharmacist" on public.suggestions for update to authenticated
  using (public.is_household_pharmacist(household_id))
  with check (public.is_household_pharmacist(household_id) and status in ('suggested'));
create policy "suggestions update patient" on public.suggestions for update to authenticated
  using (patient_id = (select auth.uid()))
  with check (patient_id = (select auth.uid()) and status in ('accepted', 'declined'));

create policy "suggestion_items read" on public.suggestion_items for select to authenticated
  using (exists (select 1 from public.suggestions s where s.id = suggestion_id
        and (s.patient_id = (select auth.uid()) or public.is_household_pharmacist(s.household_id))));
create policy "suggestion_items write" on public.suggestion_items for all to authenticated
  using (exists (select 1 from public.suggestions s where s.id = suggestion_id
        and public.is_household_pharmacist(s.household_id)))
  with check (exists (select 1 from public.suggestions s where s.id = suggestion_id
        and public.is_household_pharmacist(s.household_id)));

create policy "own prescriptions" on public.prescriptions for all to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy "own prescription_items" on public.prescription_items for all to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()) and exists (
    select 1 from public.prescriptions p
    where p.id = prescription_id and p.user_id = (select auth.uid())));

-- ============ KHO ẢNH RIÊNG TƯ (Storage) ============
-- Bucket không công khai. App lấy ảnh bằng signed URL ngắn hạn.
insert into storage.buckets (id, name, public) values
  ('user-photos', 'user-photos', false),        -- ảnh thuốc, ảnh toa: user-photos/{user_id}/...
  ('catalog-photos', 'catalog-photos', false),  -- ảnh hộp thuốc:   catalog-photos/{household_id}/...
  ('symptom-photos', 'symptom-photos', false)   -- ảnh triệu chứng: symptom-photos/{household_id}/{patient_id}/...
on conflict (id) do nothing;

create policy "user-photos own" on storage.objects for all to authenticated
  using (bucket_id = 'user-photos' and (storage.foldername(name))[1] = (select auth.uid())::text)
  with check (bucket_id = 'user-photos' and (storage.foldername(name))[1] = (select auth.uid())::text);

create policy "catalog-photos read" on storage.objects for select to authenticated
  using (bucket_id = 'catalog-photos'
         and public.is_household_member(((storage.foldername(name))[1])::uuid));
create policy "catalog-photos write" on storage.objects for all to authenticated
  using (bucket_id = 'catalog-photos'
         and public.is_household_pharmacist(((storage.foldername(name))[1])::uuid))
  with check (bucket_id = 'catalog-photos'
         and public.is_household_pharmacist(((storage.foldername(name))[1])::uuid));

create policy "symptom-photos read" on storage.objects for select to authenticated
  using (bucket_id = 'symptom-photos' and (
    (storage.foldername(name))[2] = (select auth.uid())::text
    or public.is_household_pharmacist(((storage.foldername(name))[1])::uuid)));
create policy "symptom-photos insert" on storage.objects for insert to authenticated
  with check (bucket_id = 'symptom-photos'
    and (storage.foldername(name))[2] = (select auth.uid())::text
    and public.is_household_member(((storage.foldername(name))[1])::uuid));
