import type { Page, ConsoleMessage, Request, Response } from '@playwright/test';

/**
 * Attach console error + network log listeners to a Playwright Page.
 * Returns a teardown function that returns a single string dump for the spec;
 * the caller can log it so it lands in the Playwright HTML report under the
 * test.
 *
 * Usage:
 *   test('spec', async ({ page }, testInfo) => {
 *     const dump = captureConsoleAndNetwork(page, testInfo.title);
 *     // ... test body ...
 *     console.log(dump());
 *   });
 */
export function captureConsoleAndNetwork(page: Page, label = 'spec'): () => string {
  const consoleLogs: string[] = [];
  const networkLogs: string[] = [];
  const requestFailures: string[] = [];

  // Passive gate-confirmation marker — emitted ONCE per attach when
  // E2E_DEBUG_DUMP=1 is set. Lands in worker stderr → /tmp/build-log/run*.stderr.
  // Without this marker, a "zero events during failing run" finding is
  // indistinguishable from "env stripped by capture-v6.sh's child-process
  // invocation, gate never opened" — the marker removes that ambiguity.
  // Glanceable from a `grep -nE '\[diagnostic\.e2e_debug_dump\.on\]'` on the
  // build log; if absent while E2E_DEBUG_DUMP=1 was set, the diagnostic was
  // silently off and the Bug E find loses its evidentiary value.
  if (process.env.E2E_DEBUG_DUMP === '1') {
    process.stderr.write(`[diagnostic.e2e_debug_dump.on] route-active label=${label}\n`);
  }

  const onConsole = (msg: ConsoleMessage) => {
    consoleLogs.push(`[${label}] ${msg.type()}: ${msg.text()}`);
    // ALSO surface console.error / console.warning / console.assert to worker
    // stderr immediately, so capture-v6's /tmp/build-log/run{1,2}.stderr captures
    // them even when tests fail BEFORE the post-success `console.log(dump())`
    // can run. This closes Bug E's diagnostic-visibility gap (Playwright's
    // --reporter=json does not auto-route page.on('console') into the failure
    // block). Gated on E2E_DEBUG_DUMP=1 to match the v3 instrumentation pattern
    // already used in tests/e2e/global-setup.ts -- avoids polluting normal-run
    // logs with React DevTools warnings that aren't actionable for failure triage.
    if (process.env.E2E_DEBUG_DUMP === '1') {
      if (msg.type() === 'error' || msg.type() === 'warning' || msg.type() === 'assert') {
        process.stderr.write(`[console.${msg.type()}] ${msg.text()}\n`);
      }
    }
  };
  const onPageError = (err: Error) => {
    consoleLogs.push(`[${label}] pageerror: ${err.message}`);
    // ALSO surface uncaught page errors to worker stderr immediately (same
    // rationale as onConsole above). Page errors are abnormal regardless of
    // E2E_DEBUG_DUMP -- they ALWAYS indicate a real bug, so this is not gated.
    // Stack trace lines split on '\n' are individually written so a thick
    // stack doesn't run past Playwright's line buffering into the run*.stderr
    // files. Per-line [pageerror.*] prefix keeps the stack grep-friendly.
    process.stderr.write(`[pageerror] ${err.message}\n`);
    if (err.stack) {
      for (const line of err.stack.split('\n')) {
        process.stderr.write(`[pageerror]   ${line}\n`);
      }
    }
  };
  const onRequest = (req: Request) =>
    networkLogs.push(`[${label}] -> ${req.method()} ${req.url()}`);
  const onResponse = (res: Response) => {
    networkLogs.push(`[${label}] <- ${res.status()} ${res.url()}`);
    // 4xx/5xx surface immediately -- often the highest-signal failure indicator
    // (e.g. /cameras returning 401 due to JWT-attach race). Gated on
    // E2E_DEBUG_DUMP to avoid spamming normal-run logs.
    if (process.env.E2E_DEBUG_DUMP === '1' && res.status() >= 400) {
      process.stderr.write(`[http.${res.status()}] ${res.url()}\n`);
    }
  };
  const onFailure = (req: Request) => {
    const f = req.failure();
    requestFailures.push(
      `[${label}] !! ${req.method()} ${req.url()} ${f?.errorText ?? ''}`
    );
    // Always surface -- requestfailed is abnormal regardless of E2E_DEBUG_DUMP.
    process.stderr.write(`[http.failed] ${req.method()} ${req.url()} ${f?.errorText ?? ''}\n`);
  };

  page.on('console', onConsole);
  page.on('pageerror', onPageError);
  page.on('request', onRequest);
  page.on('response', onResponse);
  page.on('requestfailed', onFailure);

  return () => {
    page.off('console', onConsole);
    page.off('pageerror', onPageError);
    page.off('request', onRequest);
    page.off('response', onResponse);
    page.off('requestfailed', onFailure);
    const head = `\n=== ${label} log capture ===`;
    const tail = `=== end ${label} ===`;
    const sections = [head];
    sections.push(`CONSOLE (${consoleLogs.length} events):`);
    sections.push(...(consoleLogs.length ? consoleLogs : ['  (none)']));
    sections.push(`NETWORK (${networkLogs.length} events):`);
    sections.push(...(networkLogs.length ? networkLogs : ['  (none)']));
    if (requestFailures.length) {
      sections.push(`REQUEST FAILURES (${requestFailures.length} events):`);
      sections.push(...requestFailures);
    }
    sections.push(tail);
    return sections.join('\n');
  };
}
