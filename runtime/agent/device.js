// Is the phone there, and is it awake?
//
// Three states the owner can act on, and nothing more nuanced, because the
// only actions available are "plug it in", "unlock it" and "tap Allow".

import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
const run = promisify(execFile);

const adb = process.env.ADB_BINARY || 'adb';

export async function devices() {
  try {
    const { stdout } = await run(adb, ['devices'], { timeout: 15000 });
    return stdout.split('\n').slice(1)
      .map((l) => l.trim()).filter(Boolean)
      .map((l) => { const [serial, state] = l.split(/\s+/); return { serial, state }; });
  } catch (err) {
    return [{ serial: null, state: 'adb-unavailable', error: err.message }];
  }
}

export async function check() {
  const found = devices instanceof Function ? await devices() : [];
  if (found.some((d) => d.state === 'adb-unavailable')) {
    return { ok: false, state: 'NO ADB', problem: 'The box cannot talk to USB at all. This is a fault in the box, not something you can fix on the phone. Contact support.' };
  }
  if (found.length === 0) {
    return { ok: false, state: 'NO PHONE', problem: 'No phone is plugged in. Check the USB cable — a charging-only cable will not work, it has to be a data cable.' };
  }
  const authorised = found.find((d) => d.state === 'device');
  if (authorised) return { ok: true, state: 'READY', serial: authorised.serial };

  const pending = found.find((d) => d.state === 'unauthorized');
  if (pending) {
    return { ok: false, state: 'NOT ALLOWED', serial: pending.serial,
      problem: 'The phone is plugged in but has not been allowed. Unlock the phone — there is a prompt asking to allow USB debugging. Tap Allow, and tick "always allow from this computer".' };
  }
  const offline = found.find((d) => d.state === 'offline');
  if (offline) {
    return { ok: false, state: 'ASLEEP', serial: offline.serial,
      problem: 'The phone is plugged in but not responding. Unplug it, unlock the screen, and plug it back in.' };
  }
  return { ok: false, state: 'UNKNOWN', problem: `The phone reports "${found[0].state}", which the box does not recognise. Unplug it and plug it back in.` };
}
