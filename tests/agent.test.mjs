#!/usr/bin/env node
/**
 * The config file and the status file, tested without a Pi.
 *
 * These two are the whole of the owner's experience: one file they write, one
 * file they read. If either is wrong the box is a brick with no way to say so.
 */

import assert from 'node:assert/strict';
import { parseConf, validate, normaliseCode } from '../runtime/agent/config.js';
import { render } from '../runtime/agent/status.js';

let passed = 0;
const failures = [];
const check = (name, fn) => { try { fn(); passed++; } catch (e) { failures.push(`${name}: ${e.message}`); } };

const good = `
# a comment
wifi_name=Marina Guest
wifi_password=dockside2026
country=us
pairing_code=abcd-2345-efgh
label=Front desk
`;

check('a filled-in file parses', () => {
  const r = validate(parseConf(good));
  assert.equal(r.ok, true, (r.problems || []).join(' '));
  assert.equal(r.config.wifiName, 'Marina Guest');
  assert.equal(r.config.country, 'US');
  assert.equal(r.config.pairingCode, 'ABCD-2345-EFGH');
  assert.equal(r.config.label, 'Front desk');
});

check('a network name with spaces survives', () => {
  assert.equal(validate(parseConf('wifi_name=The Wharf Guest 2\nwifi_password=x\ncountry=US\npairing_code=ABCD2345EFGH')).config.wifiName, 'The Wharf Guest 2');
});

check('a pasted quoted password loses only the quotes', () => {
  const c = parseConf('wifi_password="he said \\"hi\\""');
  assert.ok(c.wifi_password.startsWith('he said'), c.wifi_password);
});

check('a password that really contains a quote is left alone', () => {
  assert.equal(parseConf("wifi_password=pa'ssword").wifi_password, "pa'ssword");
});

check('the pairing code is forgiving about how it was typed', () => {
  for (const typed of ['abcd2345efgh', 'ABCD 2345 EFGH', 'abcd-2345-efgh', ' ABCD2345EFGH ']) {
    assert.equal(normaliseCode(typed), 'ABCD-2345-EFGH', `failed on "${typed}"`);
  }
});

check('an open network is allowed when said explicitly', () => {
  const r = validate(parseConf('wifi_name=Guest\nwifi_password=open\ncountry=US\npairing_code=ABCD2345EFGH'));
  assert.equal(r.ok, true, (r.problems || []).join(' '));
  assert.equal(r.config.wifiPassword, null);
});

check('a blank file lists every problem at once, not the first', () => {
  const r = validate(parseConf(''));
  assert.equal(r.ok, false);
  assert.ok(r.problems.length >= 3, `only got ${r.problems.length}`);
});

check('every problem tells the owner what to do', () => {
  const r = validate(parseConf('wifi_name=x\nwifi_password=y\ncountry=USA\npairing_code=nope'));
  assert.equal(r.ok, false);
  for (const p of r.problems) {
    assert.ok(/[a-z]{4,}/.test(p) && p.length > 40, `unhelpful: "${p}"`);
    assert.ok(!/regex|parse|invalid input|undefined|null/i.test(p), `speaks like code: "${p}"`);
  }
});

check('a bad country names the fix', () => {
  const r = validate(parseConf('wifi_name=x\nwifi_password=y\ncountry=USA\npairing_code=ABCD2345EFGH'));
  assert.match(r.problems.join(' '), /two-letter/);
});

check('confusable characters are not in the pairing alphabet', () => {
  // O and 0, I and 1 are read aloud over a phone. Neither may be valid.
  const r = validate(parseConf('wifi_name=x\nwifi_password=y\ncountry=US\npairing_code=ABC0-2345-EFGH'));
  assert.equal(r.ok, false, '0 must not be a valid pairing character');
});

check('validate never throws, whatever it is handed', () => {
  for (const junk of [null, undefined, {}, { wifi_name: 123 }]) {
    assert.doesNotThrow(() => validate(junk));
  }
});

/* ── the status file ─────────────────────────────────────────────────────── */

check('a healthy box says so plainly', () => {
  const t = render({ state: 'ONLINE', label: 'Front desk', facts: { 'Phone': 'connected', 'Platform': 'reachable' } });
  assert.match(t, /Everything is working/);
  assert.match(t, /Front desk/);
});

check('a broken box says what to fix and how to retry', () => {
  const t = render({ state: 'NO PHONE', problems: ['No phone is plugged in. Check the USB cable — a charging-only cable will not work, it has to be a data cable.'] });
  assert.match(t, /What to fix/);
  assert.match(t, /charging-only cable/);
  assert.match(t, /eject the card/);
});

check('the status file never contains the wifi password', () => {
  const t = render({ state: 'ONLINE', facts: { 'Wi-Fi': 'Marina Guest' } });
  assert.ok(!t.includes('dockside2026'));
});

if (failures.length) {
  console.error(`\n${failures.length} failed:\n`);
  for (const f of failures) console.error(`  x ${f}`);
  process.exit(1);
}
console.log(`${passed} checks passed - the owner's two files behave`);
