-- cast_ballot() opened with `select * into v_event from events where id =
-- p_event_id for update`, then did ALL of its validation (domain check,
-- ballot-completeness count) and ALL of its writes (participation, ballot,
-- selections, audit log) while holding that exclusive row lock. Since
-- every voter in the same event locks the SAME row, this fully serialized
-- every ballot submission for an event into a single-file queue - under
-- load-testing at 500 concurrent voters this showed up as ballot p95
-- latency in the tens of seconds and a real request-timeout failure rate,
-- even though the lock's actual JOB (see the participation-insert comment
-- below) never needed more than a fast final check-and-write to do safely.
--
-- This version does the exact same validation, in the exact same order,
-- with the exact same error codes - it just does the parts that don't
-- need the lock (event-not-found/not-open/domain/ballot-completeness)
-- against an unlocked read FIRST, so an obviously-invalid request never
-- joins the lock queue at all. It then acquires the lock and re-verifies
-- only what could actually have changed in the gap (state and schedule
-- bounds - the literal reason this lock exists: making sure no vote is
-- accepted after an admin closes voting mid-flight), before doing the
-- minimal set of writes. Categories/candidates can't be added, removed,
-- or renumbered once an event leaves DRAFT/SCHEDULED (see
-- assertStructuralChangesAllowed in src/actions/candidates/mutations.ts),
-- so the ballot-completeness count is safe to check unlocked; a
-- candidate's is_active flag CAN change during OPEN voting (see
-- deactivateCandidateAction), so that one check stays where it was,
-- re-verified live per selection during the locked insert loop.
--
-- Return type is unchanged from the previous migration, so this can be a
-- plain CREATE OR REPLACE.

create or replace function cast_ballot(
  p_event_id uuid,
  p_voter_auth_user_id uuid,
  p_voter_email text,
  p_selections jsonb,
  p_access_code_plain text default null
)
returns table (ballot_id uuid, submitted_at timestamptz, event_name text)
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
  -- 1. Unlocked pre-check — fails fast on the common invalid cases
  -- (not found, not open, wrong domain, malformed ballot) without ever
  -- contending for the event row's lock. Re-verified for real once
  -- locked in step 2, so a stale read here can never let anything
  -- unsafe through, only delay noticing an already-invalid request.
  select * into v_event from events where id = p_event_id;
  if not found then
    raise exception 'Event not found' using errcode = 'P0011';
  end if;
  if v_event.state <> 'OPEN' then
    raise exception 'Voting is not currently open for this event' using errcode = 'P0012';
  end if;
  if v_event.voting_opens_at is not null and now() < v_event.voting_opens_at then
    raise exception 'Voting has not opened yet' using errcode = 'P0012';
  end if;
  if v_event.voting_closes_at is not null and now() > v_event.voting_closes_at then
    raise exception 'Voting has closed' using errcode = 'P0012';
  end if;

  foreach v_domain in array v_event.allowed_domains loop
    if v_normalized_email like '%@' || lower(v_domain) then
      v_domain_ok := true;
      exit;
    end if;
  end loop;
  if not v_domain_ok then
    raise exception 'Email domain is not eligible to vote in this event' using errcode = 'P0013';
  end if;

  -- Selections must cover exactly the event's active categories — no
  -- missing, no extra, no duplicates. Safe to check unlocked: this set
  -- can't change once the event has left DRAFT/SCHEDULED.
  select count(*) into v_active_category_count
  from candidate_categories cc
  where cc.event_id = p_event_id
    and exists (select 1 from candidates c where c.category_id = cc.id and c.is_active);

  select count(*) into v_selection_count from jsonb_array_elements(p_selections);

  if v_selection_count <> v_active_category_count then
    raise exception 'Ballot must select exactly one candidate per category' using errcode = 'P0017';
  end if;

  -- 2. Acquire the lock, then re-verify only what could have changed in
  -- the gap. This — not the earlier unlocked read — is what actually
  -- guarantees no vote is accepted after voting closes.
  select * into v_event from events where id = p_event_id for update;
  if v_event.state <> 'OPEN' then
    raise exception 'Voting is not currently open for this event' using errcode = 'P0012';
  end if;
  if v_event.voting_opens_at is not null and now() < v_event.voting_opens_at then
    raise exception 'Voting has not opened yet' using errcode = 'P0012';
  end if;
  if v_event.voting_closes_at is not null and now() > v_event.voting_closes_at then
    raise exception 'Voting has closed' using errcode = 'P0012';
  end if;

  -- 3. One account = one ballot, enforced by the unique constraint itself
  -- via ON CONFLICT DO NOTHING — this is what makes it safe under two
  -- concurrent requests for the same voter, not the lock above. Must
  -- happen after the re-verified state check, atomically within the same
  -- locked transaction — otherwise a voter could end up with a
  -- participation row recorded for a vote that was actually rejected.
  insert into voter_participations (event_id, voter_auth_user_id)
  values (p_event_id, p_voter_auth_user_id)
  on conflict (event_id, voter_auth_user_id) do nothing
  returning id into v_participation_id;

  if v_participation_id is null then
    raise exception 'This account has already voted in this event' using errcode = 'P0014';
  end if;

  -- 4. Mode B (dormant for the initial DOMAIN_ONLY event, kept for
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

  -- 5. Create the anonymous ballot up front so selections can reference it.
  insert into ballots (event_id) values (p_event_id) returning id into v_ballot_id;

  for v_selection in select * from jsonb_array_elements(p_selections) loop
    v_category_id := (v_selection ->> 'categoryId')::uuid;
    v_candidate_id := (v_selection ->> 'candidateId')::uuid;

    -- Candidate must belong to this event, this category, and be active.
    -- Re-checked here (not trusted from the unlocked pre-check) because
    -- deactivating a candidate is allowed at any point during OPEN voting
    -- (see deactivateCandidateAction) — unlike category/candidate set
    -- membership, is_active can genuinely change between step 1 and here.
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

  -- 6. Non-sensitive audit trail — counts as a vote occurred, never which
  -- candidate or which voter.
  insert into audit_logs (event_id, action, metadata)
  values (p_event_id, 'BALLOT_CAST', jsonb_build_object('eventId', p_event_id));

  return query
    select b.id, b.submitted_at, v_event.name
    from ballots b
    where b.id = v_ballot_id;
end;
$$;
