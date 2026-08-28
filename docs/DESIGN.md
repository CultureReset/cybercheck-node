# Why the box is built this way

Four decisions that everything else follows from.

## The owner edits one file, on a partition any computer can mount

No terminal, no monitor, no keyboard, no SSH, no app. Write the card, open the
FAT partition, fill in three lines, eject. Headless setup that requires a
command prompt is not headless setup — it is a support call.

The same partition is where the box writes back. When something is wrong the
owner has exactly one thing to do: put the card in a computer and read
`cybercheck.status`. That file is written for the person holding the card, and
`tests/agent.test.mjs` fails if a message in it reads like a stack trace.

## The box dials out; nothing dials in

No port forwarding, no static IP, no router password, no VPN client for someone
to configure. The node opens a connection to the platform and holds it.

This is not only convenience. It is the difference between working and not
working at a marina on guest Wi-Fi, behind a phone hotspot, or on a restaurant
router nobody has the password to — which is most of where these boxes go.

## The USB debugging prompt is answered once, ever

ADB's keypair lives on a Docker volume, not in the image and not in the
container. Rebuild the container, update the node, power-cycle the box: the
phone stays authorised. Re-flash the card and it does not — which is the one
case worth walking back out to the phone for, and is documented as such.

Only one process on a machine may hold the USB handle, so adb runs inside the
node container and nowhere else. A phone that shows as `offline` is almost
always a second adb somewhere.

## The image is real Raspberry Pi OS with one stage added

Built with pi-gen, the Foundation's own builder, rather than a hand-rolled
rootfs. When a card goes wrong in a marina office at nine on a Saturday, every
ordinary Pi recovery instruction on the internet still applies to it.

Lite only. A desktop on a machine with no screen is a few hundred megabytes of
update churn and attack surface for nothing.

## What is deliberately not here

**No emulator.** An x86 Android image on an ARM Pi means full CPU emulation,
which is slow enough to be useless. The phone is a real phone. If an emulator
is ever wanted it belongs on an x86 box, filling the same executor slot.

**No state worth keeping.** Everything that matters is on the platform. Losing
a card loses a card; write another and pair it again.

**No SSH by default.** A box in a public-facing business with a default account
is a liability. Support goes through the tunnel the box itself opened.
