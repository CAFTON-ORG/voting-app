// Turns one or more k6 --summary-export JSON files into a single readable
// report: an HTML file styled to print cleanly (open it in any browser and
// use Print -> Save as PDF - no extra tooling needed), plus a direct PDF
// if Playwright happens to be available (falls back with a clear message
// if it isn't - this script never requires adding Playwright as a project
// dependency just to produce a report).
//
// Usage:
//   node load-test/generate-report.mjs --title "Election Load Test" \
//     --run 100=results/summary-100.json \
//     --run 500=results/summary-500.json \
//     --run 1000=results/summary-1000.json \
//     --run spike=results/spike-summary.json \
//     --out load-test/results/report.html
//
// Each --run <label>=<path> becomes one row/section in the report, in the
// order given. Produces <out> (HTML) always, and <out with .pdf> too if
// Playwright can be imported.

import { readFileSync, writeFileSync } from "node:fs";

function parseArgs(argv) {
  const runs = [];
  let title = "Voting System Load Test Report";
  let out = "load-test/results/report.html";
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === "--title") title = argv[++i];
    else if (argv[i] === "--out") out = argv[++i];
    else if (argv[i] === "--run") {
      const [label, path] = argv[++i].split("=");
      if (!label || !path) throw new Error(`--run must be label=path, got "${argv[i]}"`);
      runs.push({ label, path });
    }
  }
  if (runs.length === 0) throw new Error("At least one --run label=path is required");
  return { title, out, runs };
}

// k6's summary JSON shape has varied slightly across versions (e.g.
// "p(95)" vs "p(95.00)") - read defensively rather than assume one exact
// key spelling.
function metricValue(metrics, name, ...keys) {
  const metric = metrics?.[name];
  if (!metric) return null;
  const values = metric.values ?? metric; // some versions inline values at top level
  for (const key of keys) {
    if (values[key] !== undefined) return values[key];
  }
  return null;
}

function ms(value) {
  return value === null ? "—" : `${Math.round(value).toLocaleString()} ms`;
}

function count(value) {
  return value === null ? "—" : Math.round(value).toLocaleString();
}

function pct(value) {
  return value === null ? "—" : `${(value * 100).toFixed(1)}%`;
}

function loadRun({ label, path }) {
  const data = JSON.parse(readFileSync(path, "utf8"));
  const metrics = data.metrics ?? {};
  return {
    label,
    publicReadP95: metricValue(metrics, "public_read_duration", "p(95)", "p(95.00)"),
    votePageP95: metricValue(metrics, "vote_page_duration", "p(95)", "p(95.00)"),
    ballotSubmitP95: metricValue(metrics, "ballot_submit_duration", "p(95)", "p(95.00)"),
    ballotSubmitP99: metricValue(metrics, "ballot_submit_duration", "p(99)", "p(99.00)"),
    ballotSuccess: metricValue(metrics, "ballot_success_total", "count"),
    ballotAlreadyVoted: metricValue(metrics, "ballot_already_voted_total", "count"),
    ballotRateLimited: metricValue(metrics, "ballot_rate_limited_total", "count"),
    ballotOtherRejection: metricValue(metrics, "ballot_other_rejection_total", "count"),
    hardErrors: metricValue(metrics, "hard_errors_total", "count"),
    httpFailedRate: metricValue(metrics, "http_req_failed", "rate"),
    httpReqP95: metricValue(metrics, "http_req_duration", "p(95)", "p(95.00)"),
    checksPassed: metricValue(metrics, "checks", "passes"),
    checksFailed: metricValue(metrics, "checks", "fails"),
  };
}

function verdictFor(run) {
  // A simple, conservative heuristic, not a formal pass/fail policy - read
  // the actual numbers, this is just a quick visual flag. Hard errors or a
  // high raw HTTP failure rate mean real infrastructure trouble; ballot
  // rejections (already-voted, rate-limited) are expected/healthy on their
  // own and never counted against this.
  if ((run.hardErrors ?? 0) > 0 || (run.httpFailedRate ?? 0) > 0.05) return { label: "ATTENTION", tone: "bad" };
  if ((run.ballotSubmitP95 ?? 0) > 3000 || (run.publicReadP95 ?? 0) > 1500) return { label: "DEGRADED", tone: "warn" };
  return { label: "HEALTHY", tone: "good" };
}

function renderHtml({ title, runs }) {
  const rows = runs
    .map((run) => {
      const v = verdictFor(run);
      return `
        <tr>
          <td class="label">${run.label}</td>
          <td><span class="badge badge-${v.tone}">${v.label}</span></td>
          <td>${ms(run.publicReadP95)}</td>
          <td>${ms(run.votePageP95)}</td>
          <td>${ms(run.ballotSubmitP95)}</td>
          <td>${ms(run.ballotSubmitP99)}</td>
          <td>${count(run.ballotSuccess)}</td>
          <td>${count(run.ballotAlreadyVoted)}</td>
          <td>${count(run.ballotRateLimited)}</td>
          <td>${count(run.ballotOtherRejection)}</td>
          <td class="${(run.hardErrors ?? 0) > 0 ? "danger" : ""}">${count(run.hardErrors)}</td>
          <td>${pct(run.httpFailedRate)}</td>
        </tr>`;
    })
    .join("\n");

  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<title>${title}</title>
<style>
  :root { color-scheme: light; }
  body { font-family: -apple-system, "Segoe UI", Roboto, Arial, sans-serif; margin: 2.5rem; color: #1a1a1a; }
  h1 { font-size: 1.5rem; margin-bottom: 0.25rem; }
  .meta { color: #666; font-size: 0.85rem; margin-bottom: 2rem; }
  table { border-collapse: collapse; width: 100%; font-size: 0.82rem; }
  th, td { border: 1px solid #ddd; padding: 0.5rem 0.6rem; text-align: right; }
  th:first-child, td:first-child { text-align: left; }
  th { background: #f4f4f5; font-weight: 600; }
  td.label { font-weight: 600; }
  td.danger { color: #b91c1c; font-weight: 700; }
  .badge { display: inline-block; padding: 0.15rem 0.55rem; border-radius: 999px; font-size: 0.72rem; font-weight: 700; letter-spacing: 0.02em; }
  .badge-good { background: #dcfce7; color: #166534; }
  .badge-warn { background: #fef9c3; color: #854d0e; }
  .badge-bad { background: #fee2e2; color: #991b1b; }
  .legend { margin-top: 1.5rem; font-size: 0.78rem; color: #555; line-height: 1.6; }
  .legend b { color: #1a1a1a; }
  @media print {
    body { margin: 1.2cm; }
    h1 { font-size: 16pt; }
  }
</style>
</head>
<body>
  <h1>${title}</h1>
  <p class="meta">Generated ${new Date().toISOString()} · rows are labeled by the concurrency level (or scenario) passed to each k6 run, not automatically detected</p>
  <table>
    <thead>
      <tr>
        <th>Level</th>
        <th>Status</th>
        <th>Public read p95</th>
        <th>Vote page p95</th>
        <th>Ballot submit p95</th>
        <th>Ballot submit p99</th>
        <th>Votes cast</th>
        <th>Already voted</th>
        <th>Rate limited</th>
        <th>Other rejection</th>
        <th>Hard errors</th>
        <th>HTTP failed %</th>
      </tr>
    </thead>
    <tbody>
      ${rows}
    </tbody>
  </table>
  <p class="legend">
    <b>HEALTHY</b> — no hard errors, HTTP failure rate ≤5%, ballot submit p95 ≤3s, public read p95 ≤1.5s.<br/>
    <b>DEGRADED</b> — latency past those thresholds but no hard errors — the system is slow, not broken.<br/>
    <b>ATTENTION</b> — hard errors present and/or HTTP failure rate &gt;5% — check the Supabase/Vercel dashboards
    for the same time window (see docs/load-testing.md's monitoring tables) before scaling further.<br/><br/>
    <b>Already voted</b> and <b>Rate limited</b> are expected outcomes of repeated attempts by the same simulated
    voter, not failures on their own — they only matter if they show up on a <i>fresh</i> voter's first attempt.
  </p>
</body>
</html>`;
}

async function tryRenderPdf(htmlPath, pdfPath) {
  let chromium;
  try {
    ({ chromium } = await import("playwright"));
  } catch {
    console.log(
      "\nPlaywright isn't installed, so no PDF was generated - that's fine, open the .html file in any" +
        " browser and use Print -> Save as PDF for the same result. To generate the PDF directly next time," +
        " run: npm install --no-save playwright && npx playwright install chromium"
    );
    return false;
  }
  const browser = await chromium.launch();
  const page = await browser.newPage();
  await page.goto(`file://${htmlPath}`);
  await page.pdf({ path: pdfPath, format: "A4", printBackground: true, margin: { top: "1cm", bottom: "1cm" } });
  await browser.close();
  return true;
}

async function main() {
  const { title, out, runs } = parseArgs(process.argv.slice(2));
  const loaded = runs.map(loadRun);
  const html = renderHtml({ title, runs: loaded });
  writeFileSync(out, html, "utf8");
  console.log(`Wrote ${out}`);

  const pdfPath = out.replace(/\.html?$/i, "") + ".pdf";
  const { resolve } = await import("node:path");
  const wrote = await tryRenderPdf(resolve(out), resolve(pdfPath));
  if (wrote) console.log(`Wrote ${pdfPath}`);
}

main().catch((err) => {
  console.error(err.message);
  process.exit(1);
});
