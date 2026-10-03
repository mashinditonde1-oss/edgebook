-- Read-only summaries and bounded history pages; existing bet permissions remain in force.
create index if not exists bets_date_id_idx on public.bets (bet_date desc, id desc);

create or replace function public.edgebook_summary(p_start timestamptz, p_end timestamptz, p_timezone text)
returns jsonb language sql stable security invoker set search_path = '' as $$
  select jsonb_build_object(
    'totals', (select jsonb_build_object('count',count(*),'stake',coalesce(sum(stake),0),'pnl',coalesce(sum(pnl),0),'wins',count(*) filter (where result='win')) from public.bets),
    'days', coalesce((select jsonb_agg(to_jsonb(d) order by d.day) from (
      select to_char(bet_date at time zone p_timezone,'YYYY-MM-DD') as day,
        count(*) as count, coalesce(sum(pnl),0) as pnl
      from public.bets where bet_date >= p_start and bet_date < p_end
      group by 1
    ) d),'[]'::jsonb)
  );
$$;

create or replace function public.edgebook_history(
  p_start timestamptz default null, p_end timestamptz default null,
  p_search text default '', p_result text default '',
  p_limit integer default 20, p_offset integer default 0
)
returns jsonb language sql stable security invoker set search_path = '' as $$
  with filtered as (
    select b.id,b.market,b.selection,b.stake,b."return",b.result,b.bet_date,b.notes,b.pnl
    from public.bets b
    where (p_start is null or b.bet_date >= p_start)
      and (p_end is null or b.bet_date < p_end)
      and (coalesce(p_result,'')='' or b.result=p_result)
      and (coalesce(btrim(p_search),'')='' or
        strpos(lower(concat_ws(' ',b.market,b.selection,b.notes)),lower(btrim(p_search))) > 0)
  ), page as (
    select * from filtered order by bet_date desc,id desc
    limit greatest(1,least(coalesce(p_limit,20),100))
    offset greatest(0,coalesce(p_offset,0))
  )
  select jsonb_build_object(
    'total',(select count(*) from filtered),
    'items',coalesce((select jsonb_agg(to_jsonb(page) order by bet_date desc,id desc) from page),'[]'::jsonb)
  );
$$;

revoke all on function public.edgebook_summary(timestamptz,timestamptz,text) from public;
revoke all on function public.edgebook_history(timestamptz,timestamptz,text,text,integer,integer) from public;
grant execute on function public.edgebook_summary(timestamptz,timestamptz,text) to anon, authenticated;
grant execute on function public.edgebook_history(timestamptz,timestamptz,text,text,integer,integer) to anon, authenticated;

