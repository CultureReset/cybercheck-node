# Making a box

## What to buy

| | why this one |
|---|---|
| Raspberry Pi 4 (4 GB) or Pi 5 | 2 GB works; 4 GB leaves room when the phone is busy |
| **Official 5 V power supply** | the single most common field failure. A phone charger browns out the moment the handset starts drawing off the USB port, and the box then looks "randomly broken" |
| 32 GB A2 microSD, or a USB SSD | A1 cards die under container logs. An SSD is worth it if the box is somewhere you cannot easily reach |
| A **data** USB cable | most cables that come with a phone are charge-only. This is the second most common field failure |
| An Android phone | anything running Android 9 or newer |

## Building the image

Linux with Docker:

    docker run --privileged --rm tonistiigi/binfmt --install arm64   # once, on a non-ARM host
    ./image/build.sh

Roughly half an hour. The result is in `deploy/` as `.img.xz`.

## Writing it

Raspberry Pi Imager, or:

    xzcat deploy/cybercheck-node-*.img.xz | sudo dd of=/dev/sdX bs=4M status=progress conv=fsync

## Setting it up

1. Leave the card in the computer after writing it. A partition called
   **bootfs** appears.
2. Open `cybercheck.conf` on it. Fill in three things: Wi-Fi name, Wi-Fi
   password, pairing code from the dashboard.
3. Eject.
4. Card in the Pi. Phone into a USB port. Power on.
5. **On the phone**, unlock it and tap **Allow** on the USB debugging prompt.
   Tick *always allow from this computer*. This happens once, ever — the key
   is kept on a Docker volume and survives reboots.
6. Two minutes later the dashboard shows the box online.

## When it does not work

Power the box down, put the card in a computer, and read **`cybercheck.status`**
on the same partition. It is written in plain English and names the next thing
to do.

If the box is reachable over the network, `./scripts/health.sh` on the box
answers the same questions in order: power, phone, containers, internet, disk.

The three failures that account for most of them:

**Nothing on the network.** Wi-Fi name is case-sensitive and must match
exactly. The country code is not optional — the radio will not associate
without it.

**Phone shows `unauthorized`.** The Allow prompt was never tapped, or was
tapped without *always allow*. Unlock the phone and look at the screen.

**Box works, then stops under load.** Under-voltage. `vcgencmd get_throttled`
returns something other than `0x0`. Use the official supply.

## Moving a box to a new network

Edit `cybercheck.conf` on the card and power-cycle. `first-boot` runs on every
boot on purpose, so there is nothing else to learn.
