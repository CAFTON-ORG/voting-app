-- Staged, not yet applied. Prisma's schema.prisma has no syntax for RLS
-- policies or stored functions, so this is authored by hand and dropped
-- into an empty migration (`prisma migrate dev --create-only`) once a real
-- Supabase project is available. See docs/database-setup.md.
--
-- Two independent things live in this file:
--   1. RLS: enabled, default-deny, on every table.
--   2. cast_ballot(): the one function allowed to write a vote.

-- gen_random_uuid() (used as every model's @id default) and digest()
-- (used below for access-code hash lookups) both come from pgcrypto.
-- Supabase projects normally ship with it enabled already; making it
-- explicit here removes any doubt rather than assuming that's the case.
create extension if not exists pgcrypto;

-- ============================================================
-- 1. Row Level Security — default-deny backstop
-- ============================================================
-- Every table Prisma manages is reached ONLY through Prisma's `prisma`
-- role, which Supabase's own setup guide creates with BYPASSRLS (see
-- docs/security-boundaries.md). RLS therefore does not, and cannot,
-- protect this app's own normal operation. What it protects against is
-- someone bypassing the app entirely and calling Supabase's
-- auto-generated PostgREST API directly with the public/publishable key.
-- Since nothing in this app legitimately needs the browser to read these
-- tables that way, the correct policy set is enabling RLS with ZERO
-- policies — full default-deny — on every table, not a nuanced per-role
-- policy matrix.

alter table "events" enable row level security;
alter table "candidate_categories" enable row level security;
alter table "candidates" enable row level security;
alter table "voter_participations" enable row level security;
alter table "ballots" enable row level security;
alter table "ballot_selections" enable row level security;
alter table "voting_access_codes" enable row level security;
alter table "admin_users" enable row level security;
alter table "admin_invitations" enable row level security;
alter table "audit_logs" enable row level security;

-- No `create policy` statements follow, deliberately. If a genuine future
-- need arises for the browser to read a table directly via the Supabase
-- client (bypassing Prisma/Next.js), add a narrow, justified policy then
-- — do not add policies speculatively.

-- ============================================================
-- 2. cast_ballot() — the one function allowed to write a vote
-- ============================================================
-- Called from a Server Action via `prisma.$queryRaw`, never via
-- `supabase.rpc()`. Because Prisma's connection carries no Supabase JWT,
-- auth.uid() would return NULL here — so the trusted voter identity is
-- passed in as explicit parameters, already verified server-side by the
-- caller via supabase.auth.getUser() before this function is ever
-- invoked. See docs/security-boundaries.md for why this is safe: the
-- Server Action is the only code path allowed to call this function, and
-- it has already established trust before doing so.
--
-- p_selections shape: jsonb array of {"categoryId": uuid, "candidateId": uuid}
-- p_access_code_plain: the voter-entered code, plaintext, only used for
--   DOMAIN_AND_ACCESS_CODE events; null for DOMAIN_ONLY (the only mode the
--   initial event uses).
--
-- Error signaling: distinct SQLSTATEs so the calling Server Action can
-- map each one to a precise user-facing message without parsing text.
-- Starting from P0011 rather than P0001 deliberately — P0001 is Postgres's
-- own default code for a plain `RAISE EXCEPTION` with no ERRCODE given,
-- so reusing it here would collide with that if anyone ever adds a bare
-- raise elsewhere in this function later.
--   P0011 EVENT_NOT_FOUND        P0015 ACCESS_CODE_REQUIRED
--   P0012 EVENT_NOT_OPEN         P0016 ACCESS_CODE_INVALID
--   P0013 DOMAIN_NOT_ALLOWED     P0017 INCOMPLETE_BALLOT
--   P0014 ALREADY_VOTED          P0018 INVALID_CANDIDATE

create or replace function cast_ballot(
  p_event_id uuid,
  p_voter_auth_user_id uuid,
  p_voter_email text,
  p_selections jsonb,
  p_access_code_plain text default null
)
returns table (submitted_at timestamptz, event_name text)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_event record;
  v_normalized_email text := lower(trim(p_voter_email));
  v_domain text;
  v_domain_ok boolean := false;
  v_participation_id uuid;
  v_ballot_id uuid;
  v_active_category_count int;
  v_selection_count int;
  v_selection jsonb;
  v_category_id uuid;
  v_candidate_id uuid;
  v_code_id uuid;
begin
  -- 1. Load and lock the event row.
  select * into v_event from events where id = p_event_id for update;
  if not found then
    raise exception 'Event not found' using errcode = 'P0011';
  end if;

  -- 2. Event must be OPEN. Schedule bounds are advisory metadata, not a
  -- substitute for the state check — an event can only ever be voted on
  -- while an ADMIN has explicitly transitioned it to OPEN.
  if v_event.state <> 'OPEN' then
    raise exception 'Voting is not currently open for this event' using errcode = 'P0012';
  end if;
  if v_event.voting_opens_at is not null and now() < v_event.voting_opens_at then
    raise exception 'Voting has not opened yet' using errcode = 'P0012';
  end if;
  if v_event.voting_closes_at is not null and now() > v_event.voting_closes_at then
    raise exception 'Voting has closed' using errcode = 'P0012';
  end if;

  -- 3. Domain re-check, defense in depth — never trust that the caller
  -- already verified this.
  foreach v_domain in array v_event.allowed_domains loop
    if v_normalized_email like '%@' || lower(v_domain) then
      v_domain_ok := true;
      exit;
    end if;
  end loop;
  if not v_domain_ok then
    raise exception 'Email domain is not eligible to vote in this event' using errcode = 'P0013';
  end if;

  -- 4. One account = one ballot, enforced by the unique constraint itself
  -- via ON CONFLICT DO NOTHING — this is what makes it safe under two
  -- concurrent requests for the same voter, not the earlier SELECT.
  insert into voter_participations (event_id, voter_auth_user_id)
  values (p_event_id, p_voter_auth_user_id)
  on conflict (event_id, voter_auth_user_id) do nothing
  returning id into v_participation_id;

  if v_participation_id is null then
    raise exception 'This account has already voted in this event' using errcode = 'P0014';
  end if;

  -- 5. Mode B (dormant for the initial DOMAIN_ONLY event, kept for
  -- architectural extensibility — never reached while eligibility_mode is
  -- DOMAIN_ONLY).
  if v_event.eligibility_mode = 'DOMAIN_AND_ACCESS_CODE' then
    if p_access_code_plain is null or length(trim(p_access_code_plain)) = 0 then
      raise exception 'An access code is required for this event' using errcode = 'P0015';
    end if;

    select id into v_code_id
    from voting_access_codes
    where event_id = p_event_id
      and code_hash = encode(digest(p_access_code_plain, 'sha256'), 'hex')
      and status = 'UNUSED'
    for update;

    if not found then
      raise exception 'Access code is invalid, already used, or revoked' using errcode = 'P0016';
    end if;

    update voting_access_codes
    set status = 'USED', used_at = now()
    where id = v_code_id;
  end if;

  -- 6. Selections must cover exactly the event's active categories — no
  -- missing, no extra, no duplicates.
  select count(*) into v_active_category_count
  from candidate_categories cc
  where cc.event_id = p_event_id
    and exists (select 1 from candidates c where c.category_id = cc.id and c.is_active);

  select count(*) into v_selection_count from jsonb_array_elements(p_selections);

  if v_selection_count <> v_active_category_count then
    raise exception 'Ballot must select exactly one candidate per category' using errcode = 'P0017';
  end if;

  -- 7. Create the anonymous ballot up front so selections can reference it.
  insert into ballots (event_id) values (p_event_id) returning id into v_ballot_id;

  for v_selection in select * from jsonb_array_elements(p_selections) loop
    v_category_id := (v_selection ->> 'categoryId')::uuid;
    v_candidate_id := (v_selection ->> 'candidateId')::uuid;

    -- Candidate must belong to this event, this category, and be active.
    -- The @@unique(ballotId, categoryId) constraint on ballot_selections
    -- catches a duplicate-category submission if this check were ever
    -- bypassed; this raises a cleaner error before that happens.
    if not exists (
      select 1 from candidates
      where id = v_candidate_id
        and category_id = v_category_id
        and event_id = p_event_id
        and is_active
    ) then
      raise exception 'One or more selected candidates are invalid for this event' using errcode = 'P0018';
    end if;

    insert into ballot_selections (ballot_id, category_id, candidate_id)
    values (v_ballot_id, v_category_id, v_candidate_id);
  end loop;

  -- 8. Non-sensitive audit trail — counts as a vote occurred, never which
  -- candidate or which voter.
  insert into audit_logs (event_id, action, metadata)
  values (p_event_id, 'BALLOT_CAST', jsonb_build_object('eventId', p_event_id));

  return query
    select b.submitted_at, v_event.name
    from ballots b
    where b.id = v_ballot_id;
end;
$$;
