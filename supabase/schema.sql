-- ============================================================
-- newen.D  |  Supabase 스키마 (무료 플랜에서 그대로 사용 가능)
-- Supabase 대시보드 > SQL Editor 에 붙여넣고 실행하세요.
-- ============================================================

-- 1) 회원 프로필 (Supabase Auth의 auth.users 와 1:1)
create table if not exists profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  company_name text not null,
  points integer not null default 0,
  is_admin boolean not null default false,
  created_at timestamptz not null default now(),
  deleted_at timestamptz
);

-- 2) 회원가입 시 auth.users 에 새 row 가 생기면 profiles 자동 생성
create or replace function public.handle_new_user()
returns trigger as $$
declare
  v_signup_bonus integer := 500;
begin
  insert into public.profiles (id, email, company_name, points)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'company_name', ''),
    v_signup_bonus
  );

  insert into public.point_transactions (user_id, delta, reason)
  values (new.id, v_signup_bonus, 'signup_bonus');

  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- 3) 원본 소셜 데이터 (샘플데이터.xlsx 구조 그대로)
create table if not exists documents (
  id bigint generated always as identity primary key,
  collect_doc_no text,
  doc_no text unique,
  title text,
  url text,
  channel_name text,
  site_name text,
  source_name text,
  collected_date date,       -- 수집시간 일 (YYYYMMDD -> date)
  sentiment text,
  hashtags text,
  related_words text,        -- 연관어 분류 통합
  eval_words text,            -- 평가어 분류 통합
  created_at timestamptz not null default now()
);

create index if not exists idx_documents_collected_date on documents(collected_date);
create index if not exists idx_documents_title_trgm on documents using gin (title gin_trgm_ops);
-- 위 gin_trgm_ops 인덱스를 쓰려면 아래 확장 필요 (Supabase 기본 제공):
create extension if not exists pg_trgm;

-- 4) 검색탭에서 저장한 "키워드+기간" 조합 = 고유값(query)
create table if not exists saved_queries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,
  keyword text not null,
  start_date date not null,
  end_date date not null,
  volume integer not null default 0,   -- 검색 시점의 건수
  created_at timestamptz not null default now()
);

create index if not exists idx_saved_queries_user on saved_queries(user_id);

-- 5) 실제 데이터 인출(포인트 차감) 로그 — 웹 검색탭/Claude MCP 양쪽에서 기록
create table if not exists pulls (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,
  query_id uuid references saved_queries(id) on delete set null,
  keyword text not null,
  start_date date not null,
  end_date date not null,
  row_count integer not null,
  points_used integer not null,
  source text not null default 'web', -- 'web' | 'claude_mcp'
  pulled_at timestamptz not null default now()
);

create index if not exists idx_pulls_user on pulls(user_id);

-- 6) 포인트 증감 이력 (충전, 관리자 부여, 차감 모두 기록)
create table if not exists point_transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,
  delta integer not null,           -- +충전/부여, -차감
  reason text not null,             -- 'charge' | 'admin_grant' | 'pull' | 'signup_bonus'
  admin_id uuid references profiles(id),
  created_at timestamptz not null default now()
);

-- 7) Claude(MCP)에서 이 계정을 식별하기 위한 API 키
create table if not exists api_keys (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,
  api_key text not null unique,
  created_at timestamptz not null default now(),
  revoked_at timestamptz
);

create index if not exists idx_api_keys_key on api_keys(api_key) where revoked_at is null;

-- ============================================================
-- Row Level Security
-- 관리자 화면 / MCP 서버는 service_role 키로 서버에서만 접근하므로
-- RLS 는 "본인 데이터만" 보게 막는 용도입니다.
-- ============================================================
alter table profiles enable row level security;
alter table saved_queries enable row level security;
alter table pulls enable row level security;
alter table point_transactions enable row level security;
alter table api_keys enable row level security;

create policy "본인 프로필 조회" on profiles for select using (auth.uid() = id);
create policy "본인 프로필 수정" on profiles for update using (auth.uid() = id);

create policy "본인 검색 조회" on saved_queries for select using (auth.uid() = user_id);
create policy "본인 검색 생성" on saved_queries for insert with check (auth.uid() = user_id);

create policy "본인 인출로그 조회" on pulls for select using (auth.uid() = user_id);

create policy "본인 포인트내역 조회" on point_transactions for select using (auth.uid() = user_id);

create policy "본인 API키 조회" on api_keys for select using (auth.uid() = user_id);
create policy "본인 API키 생성" on api_keys for insert with check (auth.uid() = user_id);

-- documents 테이블은 로그인 사용자 누구나 "건수 조회"는 가능하되
-- 실제 행 데이터는 서버(API route, service_role)를 통해서만 내려줍니다.
alter table documents enable row level security;
create policy "로그인 사용자 문서 조회(건수 계산용)" on documents for select using (auth.role() = 'authenticated');

-- ============================================================
-- 포인트 차감 함수 (원자적 처리)
-- 실제 데이터 행은 newen.D DB가 아니라 외부 소셜데이터 API에서 가져오므로
-- (lib/socialDataApi.ts 참고), 이 함수는 "포인트를 안전하게 차감하고
-- 인출 로그를 남기는 것"만 담당합니다. 매칭/조회는 외부 API 호출 쪽에서 처리합니다.
-- 반환값: 실제로 차감된 포인트(요청한 amount 와 보유 포인트 중 작은 값)
-- ============================================================
create or replace function public.deduct_points(
  p_user_id uuid,
  p_amount integer,
  p_keyword text,
  p_start date,
  p_end date,
  p_query_id uuid default null,
  p_source text default 'web'
)
returns integer
language plpgsql
security definer
as $$
declare
  v_points integer;
  v_take integer;
begin
  select points into v_points from profiles where id = p_user_id for update;
  if v_points is null then
    raise exception 'user not found';
  end if;

  v_take := least(p_amount, v_points);

  if v_take <= 0 then
    return 0;
  end if;

  update profiles set points = points - v_take where id = p_user_id;

  insert into pulls (user_id, query_id, keyword, start_date, end_date, row_count, points_used, source)
  values (p_user_id, p_query_id, p_keyword, p_start, p_end, v_take, v_take, p_source);

  insert into point_transactions (user_id, delta, reason)
  values (p_user_id, -v_take, 'pull');

  return v_take;
end;
$$;

-- 기존 pull_data() 함수(로컬 documents 테이블 전용)는 개발/테스트 fallback
-- 용도로만 남겨둡니다. 실제 운영에서는 deduct_points() + 외부 API 조합을 씁니다.
