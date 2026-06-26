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

  const onConsole = (msg: ConsoleMessage) =>
    consoleLogs.push(`[${label}] ${msg.type()}: ${msg.text()}`);
  const onPageError = (err: Error) =>
    consoleLogs.push(`[${label}] pageerror: ${err.message}`);
  const onRequest = (req: Request) =>
    networkLogs.push(`[${label}] -> ${req.method()} ${req.url()}`);
  const onResponse = (res: Response) =>
    networkLogs.push(`[${label}] <- ${res.status()} ${res.url()}`);
  const onFailure = (req: Request) => {
    const f = req.failure();
    requestFailures.push(
      `[${label}] !! ${req.method()} ${req.url()} ${f?.errorText ?? ''}`
    );
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
