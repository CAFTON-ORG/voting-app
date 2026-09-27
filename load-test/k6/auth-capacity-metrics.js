// Deliberately separate from metrics.js (the voting-system metrics) - see
// auth-capacity-test.js's own top comment for why this result must never
// be blended with or presented alongside voting-capacity numbers.
import { Trend, Counter } from "k6/metrics";

export const authAttemptDuration = new Trend("auth_attempt_duration", true);
export const authSuccess = new Counter("auth_success_total");
export const authRateLimited = new Counter("auth_rate_limited_total"); // HTTP 429 specifically
export const authOtherFailure = new Counter("auth_other_failure_total");
