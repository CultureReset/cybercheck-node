> **Status: replaced.** This is the earlier Raspberry Pi image for a box with a
> phone on the screen. A Ghost box now uses `Boxes` (the screen) and
> `nextgent-ghost-image` (the installer). It is not part of the Ghost system. Do
> not run this image's mirror script, udev rule or docker service on a Ghost box:
> they would start a second adb owner. `Boxes` carries copies of `runtime/agent/`,
> `image/` and `boot/` (as `box/agent/`, `box/image/`, `box/boot/`).
> `npm test` runs 14 checks on the config and status files (`tests/agent.test.mjs`)
> and 18 on the desktop executor (`tests/desktop.test.mjs`); the desktop test
> skips without Xvfb, xdotool and scrot.

---

# cybercheck-node

A Linux box with a phone on the screen, that a business owner talks to.

Write the image to a card or a flash drive, edit one file, put it in a
Raspberry Pi, plug the phone in, power on. The phone appears on the screen by
itself, and the desktop can be driven by voice or text from anywhere.

<!-- branches:start -->
## Branches

*Read from GitHub on 2026-09-29. 2 branches.*

- **Default branch on GitHub:** `claude/review-codebase-zips-hck9hd`.
- **`claude/repo-code-analysis-y4n1k7`** is where this README and the audit fixes live. It contains every commit on `claude/review-codebase-zips-hck9hd` and more (this README, the audit fixes and the screenshots).
- Every other branch is already contained in `claude/repo-code-analysis-y4n1k7`; nothing is only on another branch.

| Branch | Last commit | Not in the work branch | Last commit message |
| --- | --- | --- | --- |
| `claude/repo-code-analysis-y4n1k7` (work branch) | 2026-09-29 | - | this README and the audit fixes |
| `claude/review-codebase-zips-hck9hd` (default) | 2026-08-29 | 0 | Turn the box around: the desktop is driven, the phone is the way in |

<!-- branches:end -->

## What it actually is

    owner calls or texts  ──►  the phone         ← the number, and the microphone
                                    │
                                    ▼  tells the box what to do
                        ┌───────────────────────────┐
                        │      Linux desktop        │   ← what gets driven
                        │  ┌─────────────────────┐  │
                        │  │  the phone, mirrored │  │  ← scrcpy, an ordinary window
                        │  └─────────────────────┘  │
                        │   browser · logged-in     │
                        │   tools · anything else   │
                        └───────────────────────────┘

**The desktop is the thing being operated.** The phone is how the owner reaches
it, and it is also on the screen — so its apps are reachable too.

The trick is that once the phone is a *window*, one mechanism drives
everything. A browser tab, a point-of-sale app, a spreadsheet and the handset
are all the same kind of target: pointer and keyboard events against a desktop.
One thing to get right instead of two.

## Making one

1. Build the image: `./image/build.sh` — about half an hour, needs Linux and
   Docker.
2. Write `deploy/cybercheck-node-*.img.xz` to a card or a USB stick.
3. Leave it in the computer. A partition called **bootfs** appears. Open
   `cybercheck.conf` on it and fill in three things: Wi-Fi name, Wi-Fi
   password, pairing code.
4. Eject. Card into the Pi, phone into a USB port, power on.
5. On the phone, unlock it and tap **Allow** on the USB debugging prompt. Tick
   *always allow*. Once, ever.
6. The phone appears on the screen. The dashboard shows the box online.

If something is wrong, power off, put the card back in a computer, and read
**`cybercheck.status`** on the same partition. It is written in plain English
and names the next thing to do.

## What runs on it

| | |
|---|---|
| **X11 + openbox** | a desktop with a window manager and nothing else |
| **scrcpy** | the phone as a window, restarted whenever it is unplugged |
| **the executor** | click, drag, type, key, focus, screenshot against that desktop |
| **the node** | receives work, runs it, reports back (container image `ghcr.io/culturereset/cybercheck-node`; its main program is not in this repo) |
| **the tunnel** | one outbound connection; nothing dials in (container image `ghcr.io/culturereset/cybercheck-tunnel`; not in this repo) |

## Why X11 and not Wayland

Wayland has no sanctioned way for one process to synthesise input into
another's window. Every workaround is compositor-specific and breaks on update.
X11's are twenty years old and boring, which is exactly what an appliance in a
marina office needs.

## Why no emulator

An x86 Android image on an ARM Pi means full CPU emulation — too slow to be
useful. The phone is a real phone. If an emulator is ever wanted it belongs on
an x86 host, filling the same executor slot.

## Checks

    npm test          config parsing, status reporting, and the desktop
                      executor driven against a real X server

`tests/desktop.test.mjs` starts Xvfb, puts a real window on it, and makes the
executor focus it, type into it and screenshot it. It skips cleanly where X is
not installed, and says plainly which assertions the display could not verify.

    ./scripts/health.sh    on the box: power, phone, containers, network, disk

## Layout

    boot/       the file the owner edits, and the status the box writes back
    runtime/    the agent's libraries (config, status, phone check, desktop
                executor) and docker-compose. The `node` and `tunnel`
                containers are images pulled from ghcr.io; the node's entry
                point (`index.js`) and `scripts/healthcheck.js` are not in
                this repo.
    image/      the pi-gen stage that builds the card
    scripts/    first boot and health
    docs/       FLASH.md (buying, building, writing) and DESIGN.md (why)
    tests/      runnable without a Pi
