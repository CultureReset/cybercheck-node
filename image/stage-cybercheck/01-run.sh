#!/bin/bash -e
# The one stage that turns Raspberry Pi OS Lite into the appliance.

install -m 644 files/cybercheck.conf.example "${ROOTFS_DIR}/boot/firmware/cybercheck.conf"
install -m 755 files/first-boot.sh           "${ROOTFS_DIR}/usr/local/sbin/cybercheck-first-boot"
install -m 644 files/cybercheck-node.service "${ROOTFS_DIR}/etc/systemd/system/cybercheck-node.service"
install -m 644 files/cybercheck-boot.service "${ROOTFS_DIR}/etc/systemd/system/cybercheck-boot.service"
install -m 644 files/99-android.rules        "${ROOTFS_DIR}/etc/udev/rules.d/99-android.rules"
install -d "${ROOTFS_DIR}/opt/cybercheck"
install -m 644 files/docker-compose.yml      "${ROOTFS_DIR}/opt/cybercheck/docker-compose.yml"

on_chroot << EOF
curl -fsSL https://get.docker.com | sh
usermod -aG docker cybercheck
systemctl enable docker
systemctl enable cybercheck-boot.service
# The node service is enabled by first-boot, once there is a network.
systemctl disable cybercheck-node.service || true
EOF
