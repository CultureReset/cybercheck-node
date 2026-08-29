#!/usr/bin/env node
/**
 * The desktop executor, driving a real X server.
 *
 * Not mocked. This starts Xvfb, puts a real window on it, and makes the
 * executor click, type, focus and screenshot against it — because "the script
 * parses" is not the same claim as "the box can drive a desktop".
 *
 * Skips cleanly if Xvfb or xdotool are not installed, so the suite still runs
 * on a machine without them.
 */

import assert from 'node:assert/strict';
import { spawn, execFileSync } from 'node:child_process';
import { existsSync, statSync, unlinkSync } from 'node:fs';

const have = (b) => { try { execFileSync('which', [b], { stdio: 'ignore' }); return true; } catch { return false; } };
if (!have('Xvfb') || !have('xdotool') || !have('scrot')) {
  console.log('skipped - Xvfb, xdotool or scrot not installed');
  process.exit(0);
}

const DISPLAY = ':91';
process.env.DISPLAY = DISPLAY;

const xvfb = spawn('Xvfb', [DISPLAY, '-screen', '0', '1280x800x24'], { stdio: 'ignore' });
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
await wait(1200);

const desktop = await import('../runtime/agent/executor/desktop.js');

// A headless X server with no virtual input device accepts every mousemove and
// moves nothing. Find that out once, and say so, rather than reporting six
// failures that are about the container and not the code.
const canPoint = await desktop.pointerWorks();
if (!canPoint) {
  console.log('note: this display accepts pointer commands but does not move the pointer');
  console.log('      (no virtual input device) — position is asserted as "command accepted"');
}

let passed = 0;
const failures = [];
const check = async (name, fn) => { try { await fn(); passed++; } catch (e) { failures.push(`${name}: ${e.message}`); } };

let app = null;
const cleanup = () => { try { app?.kill(); } catch {} try { xvfb.kill(); } catch {} };
process.on('exit', cleanup);

/* ── the display ─────────────────────────────────────────────────────────── */

await check('the executor sees the desktop and its size', async () => {
  const r = await desktop.ready();
  assert.equal(r.ok, true, r.error);
  assert.equal(r.width, 1280);
  assert.equal(r.height, 800);
});

/* ── the pointer really moves ────────────────────────────────────────────── */

await check('moving the pointer is accepted, and lands when the display allows it', async () => {
  const r = await desktop.move({ x: 400, y: 300 });
  assert.deepEqual(r.at, { x: 400, y: 300 });
  if (canPoint) {
    const at = await desktop.pointer();
    assert.deepEqual([at.x, at.y], [400, 300]);
  }
});

await check('coordinates are rounded, not rejected', async () => {
  const r = await desktop.move({ x: 123.7, y: 456.2 });
  assert.deepEqual(r.at, { x: 124, y: 456 });
});

await check('a click reports where it was aimed', async () => {
  const r = await desktop.click({ x: 640, y: 400 });
  assert.deepEqual(r.clicked, { x: 640, y: 400, button: 1, double: false });
  if (canPoint) {
    const at = await desktop.pointer();
    assert.deepEqual([at.x, at.y], [640, 400]);
  }
});

await check('a drag presses, moves and releases without error', async () => {
  const r = await desktop.drag({ from: { x: 100, y: 100 }, to: { x: 700, y: 500 } });
  assert.deepEqual(r.dragged.to, { x: 700, y: 500 });
  if (canPoint) {
    const at = await desktop.pointer();
    assert.deepEqual([at.x, at.y], [700, 500]);
  }
});

await check('a move without coordinates is refused', async () => {
  await assert.rejects(() => desktop.move({}), /numeric x and y/);
});

await check('a click without coordinates is refused, not guessed', async () => {
  await assert.rejects(() => desktop.click({}), /numeric x and y/);
});

/* ── a real window ───────────────────────────────────────────────────────── */

app = spawn('xclock', ['-digital', '-title', 'Pixel 7 Pro'], { env: { ...process.env, DISPLAY }, stdio: 'ignore' });
await wait(1500);

await check('open windows are listed with their geometry', async () => {
  const all = await desktop.windows();
  const found = all.find((w) => w.name.includes('Pixel'));
  assert.ok(found, `expected a window named like the phone, saw: ${all.map((w) => w.name).join(', ')}`);
  assert.ok(found.width > 0 && found.height > 0);
});

await check('the mirrored phone is found by part of its name, not a fixed title', async () => {
  const r = await desktop.focus({ match: 'pixel' });   // lowercase, partial
  assert.match(r.focused.name, /Pixel/);
});

await check('focus still works with no window manager present', async () => {
  // Xvfb here has no WM, so _NET_ACTIVE_WINDOW is unavailable and
  // windowactivate fails. The fallback must carry it.
  const r = await desktop.focus({ match: 'pixel' });
  assert.ok(['activate', 'raise+focus'].includes(r.how), `unexpected: ${r.how}`);
});

await check('a missing window says what IS open', async () => {
  await assert.rejects(() => desktop.focus({ match: 'nothing-like-this' }), /Open windows:/);
});

/* ── typing ──────────────────────────────────────────────────────────────── */

await check('typing reports what it sent', async () => {
  const r = await desktop.type({ text: 'open at nine tomorrow', delayMs: 1 });
  assert.equal(r.typed, 21);
});

await check('keys are pressed by name', async () => {
  const r = await desktop.key({ keys: ['ctrl+a', 'Escape'] });
  assert.deepEqual(r.pressed, ['ctrl+a', 'Escape']);
});

/* ── seeing ──────────────────────────────────────────────────────────────── */

await check('a screenshot is a real, non-empty image', async () => {
  const path = '/tmp/cybercheck-test-screen.png';
  if (existsSync(path)) unlinkSync(path);
  const r = await desktop.screenshot({ path });
  assert.ok(existsSync(r.path), 'no file was written');
  assert.ok(statSync(r.path).size > 1000, `image is only ${statSync(r.path).size} bytes`);
  unlinkSync(r.path);
});

/* ── steps, the vocabulary the kernel speaks ─────────────────────────────── */

await check('a sequence of steps runs in order', async () => {
  const done = await desktop.runSteps([
    { focus: 'pixel' },
    { click: { x: 300, y: 200 } },
    { type: 'hello', delayMs: 1 },
    { wait: 10 },
  ]);
  assert.equal(done.length, 4);
  assert.equal(done[2].result.typed, 5);
});

await check('an unknown step is refused rather than skipped', async () => {
  await assert.rejects(() => desktop.step({ teleport: true }), /unknown step/);
});

await check('a failing step stops the sequence', async () => {
  await assert.rejects(() => desktop.runSteps([{ click: { x: 1, y: 1 } }, { focus: 'not-there' }, { type: 'never' }]));
});

/* ── the error a person will actually hit ────────────────────────────────── */

await check('no desktop names the display instead of saying "cannot open display"', async () => {
  process.env.DISPLAY = ':99';
  const r = await desktop.ready();
  process.env.DISPLAY = DISPLAY;
  assert.equal(r.ok, false);
  assert.match(r.error, /:99/);
});

cleanup();

if (failures.length) {
  console.error(`\n${failures.length} failed:\n`);
  for (const f of failures) console.error(`  x ${f}`);
  process.exit(1);
}
console.log(`${passed} checks passed - the executor drives a real X desktop: click, drag, type, focus, screenshot`);
if (!canPoint) console.log('       pointer landing not verified here — needs a display with an input device');
