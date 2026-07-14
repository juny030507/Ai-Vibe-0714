create table if not exists public.lotto_draws (
  id bigint generated always as identity primary key,
  numbers smallint[] not null,
  created_at timestamptz not null default now(),
  constraint lotto_draws_six_numbers check (cardinality(numbers) = 6),
  constraint lotto_draws_sorted_unique check (
    numbers[1] < numbers[2]
    and numbers[2] < numbers[3]
    and numbers[3] < numbers[4]
    and numbers[4] < numbers[5]
    and numbers[5] < numbers[6]
  ),
  constraint lotto_draws_number_range check (
    numbers <@ array[
      1, 2, 3, 4, 5, 6, 7, 8, 9, 10,
      11, 12, 13, 14, 15, 16, 17, 18, 19, 20,
      21, 22, 23, 24, 25, 26, 27, 28, 29, 30,
      31, 32, 33, 34, 35, 36, 37, 38, 39, 40,
      41, 42, 43, 44, 45
    ]::smallint[]
  )
);

alter table public.lotto_draws enable row level security;

revoke all on table public.lotto_draws from anon, authenticated;
revoke all on sequence public.lotto_draws_id_seq from anon, authenticated;
grant select, insert on table public.lotto_draws to service_role;
grant usage, select on sequence public.lotto_draws_id_seq to service_role;

comment on table public.lotto_draws is '행운 번호 연구소에서 생성한 로또 번호';
