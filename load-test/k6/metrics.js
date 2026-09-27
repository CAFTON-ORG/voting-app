// One shared set of custom metrics, imported by every scenario script, so
// results from voting-load-test.js and spike-test.js are directly
// comparable in the k6 summary/output.
import { Trend, Counter } from "k6/metrics";

export const publicReadDuration = new Trend("public_read_duration", true);
export const votePageDuration = new Trend("vote_page_duration", true);
export const ballotSubmitDuration = new Trend("ballot_submit_duration", true);

// Every ballot-submit attempt lands in exactly one of these four buckets -
// together they should always sum to the total number of submit attempts.
// See errors.ts's ERROR_MESSAGES and cast-ballot.ts's own rate-limit
// message for the exact strings matched in voting-load-test.js.
export const ballotSuccess = new Counter("ballot_success_total");
export const ballotAlreadyVoted = new Counter("ballot_already_voted_total");
export const ballotRateLimited = new Counter("ballot_rate_limited_total");
export const ballotOtherRejection = new Counter("ballot_other_rejection_total");

// A 5xx or a network-level failure on ANY request type - this is the one
// that actually means "the server/database couldn't keep up," as opposed
// to an expected 200 + { ok: false } business rejection.
export const hardErrors = new Counter("hard_errors_total");
