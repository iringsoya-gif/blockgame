-- ============================================================
-- BlockQuest 전체 DB 스키마
-- Supabase SQL Editor에서 순서대로 실행
-- ============================================================

-- ── 유저 프로필 ─────────────────────────────────────────────
create table if not exists profiles (
  id         uuid references auth.users on delete cascade primary key,
  username   text,
  avatar_url text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- 새 유저 자동 프로필 생성
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer as $$
begin
  insert into public.profiles (id, username, avatar_url)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1)),
    new.raw_user_meta_data->>'avatar_url'
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- ── 게임 세이브 ─────────────────────────────────────────────
create table if not exists game_saves (
  id            uuid default gen_random_uuid() primary key,
  user_id       uuid references profiles(id) on delete cascade,
  guide_id      text    default 'default',
  story_context jsonb   default '{}',
  player_stats  jsonb   default '{}',
  updated_at    timestamptz default now()
);

create unique index if not exists game_saves_user_guide
  on game_saves(user_id, guide_id);

-- 엔드리스 모드 최고 기록 (유저당 1행, 최고점만 유지)
create table if not exists endless_scores (
  user_id    uuid references profiles(id) on delete cascade primary key,
  best_score int     default 0,
  best_lines int     default 0,
  updated_at timestamptz default now()
);
alter table endless_scores enable row level security;
create policy "users manage own endless score"
  on endless_scores for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- 엔드리스 글로벌 랭킹 뷰
create or replace view endless_leaderboard as
select e.user_id, p.username, e.best_score, e.best_lines
from endless_scores e
join profiles p on p.id = e.user_id
order by e.best_score desc
limit 100;

-- ── 구독 ────────────────────────────────────────────────────
create table if not exists subscriptions (
  id                    uuid default gen_random_uuid() primary key,
  user_id               uuid references profiles(id) on delete cascade,
  polar_subscription_id text unique,
  status                text    default 'active',
  created_at            timestamptz default now(),
  updated_at            timestamptz default now()
);

-- ── 런 기록 ─────────────────────────────────────────────────
create table if not exists runs (
  id               uuid default gen_random_uuid() primary key,
  user_id          uuid references profiles(id) on delete cascade,
  player_class     text,
  status           text    default 'active',  -- active | finished | abandoned
  ending_id        text,
  survived_battles int     default 0,
  total_lines      int     default 0,
  final_level      int     default 1,
  final_gold       int     default 0,
  cleared          bool    default false,
  play_time_sec    int     default 0,
  created_at       timestamptz default now(),
  updated_at       timestamptz default now()
);

-- 유저당 active 런 1개 보장 인덱스 (partial)
create unique index if not exists runs_one_active_per_user
  on runs(user_id) where status = 'active';

-- ── 해금 콘텐츠 ─────────────────────────────────────────────
create table if not exists unlocks (
  id         uuid default gen_random_uuid() primary key,
  user_id    uuid references profiles(id) on delete cascade,
  unlock_id  text,
  created_at timestamptz default now(),
  unique(user_id, unlock_id)
);

-- ── 스킬 구매 이력 ──────────────────────────────────────────
create table if not exists skill_purchases (
  id         uuid default gen_random_uuid() primary key,
  user_id    uuid references profiles(id) on delete cascade,
  run_id     uuid references runs(id) on delete cascade,
  upgrade_id text,
  created_at timestamptz default now()
);

-- ============================================================
-- RLS (Row Level Security)
-- ============================================================
alter table profiles       enable row level security;
alter table game_saves     enable row level security;
alter table subscriptions  enable row level security;
alter table runs           enable row level security;
alter table unlocks        enable row level security;
alter table skill_purchases enable row level security;

-- profiles
create policy "users read own profile"
  on profiles for select using (auth.uid() = id);
create policy "users update own profile"
  on profiles for update using (auth.uid() = id);

-- game_saves
create policy "users manage own saves"
  on game_saves for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- subscriptions
create policy "users read own subscription"
  on subscriptions for select using (auth.uid() = user_id);

-- runs (서비스 키는 모두 접근 가능, 유저는 자신 것만)
create policy "users manage own runs"
  on runs for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- unlocks
create policy "users manage own unlocks"
  on unlocks for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- skill_purchases
create policy "users manage own skill purchases"
  on skill_purchases for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ============================================================
-- 유용한 뷰
-- ============================================================
create or replace view user_stats as
select
  p.id,
  p.username,
  count(r.id)                                        as total_runs,
  count(r.id) filter (where r.cleared)               as cleared_runs,
  coalesce(sum(r.total_lines), 0)                    as total_lines,
  coalesce(max(r.final_level), 1)                    as max_level,
  coalesce(max(r.final_gold), 0)                     as max_gold
from profiles p
left join runs r on r.user_id = p.id and r.status = 'finished'
group by p.id, p.username;

-- ============================================================
-- 업적 테이블 (서버사이드 검증용)
-- ============================================================
create table if not exists user_achievements (
  id          uuid default gen_random_uuid() primary key,
  user_id     uuid references profiles(id) on delete cascade,
  ach_id      text not null,
  earned_at   timestamptz default now(),
  unique(user_id, ach_id)
);

alter table user_achievements enable row level security;
create policy "users manage own achievements"
  on user_achievements for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- runs 테이블에 play_time_sec, guide_id 추가
alter table runs add column if not exists play_time_sec int default 0;
alter table runs add column if not exists guide_id text default 'default';

-- ============================================================
-- 일일 챌린지
-- ============================================================
create table if not exists challenge_entries (
  id             uuid default gen_random_uuid() primary key,
  user_id        uuid references profiles(id) on delete cascade,
  challenge_date date not null,
  score          int  default 0,
  lines_cleared  int  default 0,
  time_taken     int  default 0,
  win            bool default false,
  completed      bool default false,
  created_at     timestamptz default now(),
  unique(user_id, challenge_date)
);

alter table challenge_entries enable row level security;
create policy "users manage own challenge entries"
  on challenge_entries for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- 오늘 챌린지 랭킹 뷰
create or replace view challenge_leaderboard_today as
select
  ce.user_id,
  p.username,
  p.avatar_url,
  ce.score,
  ce.lines_cleared,
  ce.time_taken,
  ce.win,
  rank() over (order by ce.score desc, ce.time_taken asc) as rank
from challenge_entries ce
join profiles p on p.id = ce.user_id
where ce.challenge_date = current_date
  and ce.completed = true
order by rank;
