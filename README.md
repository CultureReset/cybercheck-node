# cybercheck-node

A Raspberry Pi with a phone plugged into it, that a business owner never has to
think about.

Write the image to a card, edit one file, put the card in the Pi, plug in the
phone, power it on. It finds its way out to the platform on its own and starts
taking work. No monitor, no keyboard, no port forwarding, no static IP, no
router configuration.

## What it is

    owner's phone ──── text or call ────► platform
                                              │
                                              ▼ outbound tunnel, dialled by the box
                                        ┌───────────────┐
                                        │  Raspberry Pi │  ← this repo
                                        │   the node    │
                                        └───────┬───────┘
                                                │ USB
                                                ▼
                                        Android handset
                                                │
                                                ▼
                                        the apps on it

The Pi is the only thing that touches the phone. The platform never reaches
into a home network — the box dials out and holds the connection open.

## Flashing one

1. Write `cybercheck-node.img` to a card or a USB stick.
2. Open the small `boot` partition — it mounts on any Mac, Windows or Linux
   machine — and edit `cybercheck.conf`. Wi-Fi name, Wi-Fi password, and the
   pairing code from the dashboard. Three lines.
3. Eject. Put it in the Pi. Plug the phone into a USB port. Power on.
4. On the phone, tap **Allow** on the USB debugging prompt, once, ever.
5. The dashboard shows the node online in about two minutes.

There is no step 6. If something is wrong the box says so in
`cybercheck.status` on that same partition, in plain English, which the owner
can read by putting the card back in a computer.

## Why it is built this way

**One file on a partition anyone can mount.** Everything a non-technical person
must supply is in `cybercheck.conf`. Headless setup that requires a terminal
is not headless setup.

**Outbound only.** The box opens a connection to the platform and keeps it.
Nothing needs a port opened, and it works behind a phone hotspot, a marina's
guest Wi-Fi, or a restaurant's router that nobody has the password to.

**ADB keys survive reboots.** The phone's "Allow USB debugging?" prompt is
answered once. The keypair lives on a Docker volume, not in the image, so
re-flashing the card does not make the owner walk back out to the phone.

**Re-flashable.** All state worth keeping is on the platform. Losing the card
loses a card.

## Layout

    boot/       the file the owner edits, and the status file the box writes back
    runtime/    docker-compose and the node agent that pairs, reports and works
    image/      pi-gen stage that turns Raspberry Pi OS Lite into this appliance
    scripts/    first-boot provisioning and health checks
    tests/      config parsing and pairing logic, runnable without a Pi

## Checks

    npm test        config parsing, status reporting, pairing — no hardware
    ./scripts/health.sh   run on the box: power, USB, device, tunnel, containers
