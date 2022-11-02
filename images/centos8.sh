#!/bin/bash
# must be run as root
# must be run with image "CentOS-8.X.-.iso" with minimal install
# must be prepared /etc/selinux/config > SELINUX=disabled > reboot
# must be confirmed script sequence before running

# required
DNS=""						# set your dns server
NTP=""						# set your ntp server

# optional
SWAP_OFF=true				# set swap fs off
REPO_PATH=""				# set your repository
REPO_UPGRADE=true			# trigger upgrade task
SSL_PUB_KEY=""				# set your master public ssh key
TIME_ZONE="Asia/Seoul"		# set your timezone

# 1. remove non-cloudic packages

## swap system off			# check stable way
if [ $SWAP_OFF == true ]; then
swapoff -a
rm -rf /swap.img
sed -i '/swap/d' /etc/fstab
fi

## remove package from yum
systemctl disable vmtoolsd
systemctl stop vmtoolsd
yum remove -y open-vm-tools

# upgrade && install basic packages
if [ -n "$REPO" ]; then
rm -rf /etc/yum.repos.d/*
cat <<EOF> /etc/yum.repos.d/cloud.repo
[BaseOS]
name=Cloud BaseOS Repository
baseurl=$REPO/BaseOS/
gpgcheck=0
enabled=1

[AppStream]
name=Cloud AppStream Repository
baseurl=$REPO/AppStream/
gpgcheck=0
enabled=1
EOF
fi
if [ $REPO_UPGRADE == true ]; then
yum update -y
yum install -y net-tools bind-utils tar perl wget
fi

# settings
## grub bootloader
sed -i 's/GRUB_TIMEOUT=5/GRUB_TIMEOUT=0/g' /etc/default/grub
grub2-mkconfig -o /boot/efi/EFI/centos/grub.cfg

## ssh
sed -i 's/#ClientAliveInterval 0/ClientAliveInterval 300/g' /etc/ssh/sshd_config
sed -i 's/#ClientAliveCountMax 3/ClientAliveCountMax 12/g' /etc/ssh/sshd_config
sed -i 's/#PubkeyAuthentication yes/PubkeyAuthentication yes/g' /etc/ssh/sshd_config
cat <<EOF> /etc/ssh/ssh_config.d/99-cloud.conf
StrictHostKeyChecking no
UserKnownHostsFile /dev/null
EOF
mkdir -p /root/.ssh
if [ -n "$SSL_PUB_KEY" ]; then
	echo "$SSL_PUB_KEY" >> /root/.ssh/authorized_keys
	chmod 600 /root/.ssh/authorized_keys
fi
systemctl restart sshd

## system daemon
sed -i 's/#DefaultTimeoutStartSec=90s/DefaultTimeoutStartSec=10s/g' /etc/systemd/system.conf
sed -i 's/#DefaultTimeoutStopSec=90s/DefaultTimeoutStopSec=10s/g' /etc/systemd/system.conf
systemctl daemon-reload

## network & time
cp /usr/share/zoneinfo/$TIME_ZONE /etc/localtime
if [ -n "$DNS" ]; then
	sed -i "s/#DNS=/DNS=$DNS/g" /etc/systemd/resolved.conf
fi
if [ -n "$NTP" ]; then
	sed -i "s/server /#server /g" /etc/chrony.conf
	echo "server $NTP iburst" >> /etc/chrony.conf
fi

# install required packages
## vmware tools
echo "check vmware tools disconnection in vcenter"
echo "and execute installing vmware tools in guest operation menu"
echo -n "press enter to next: "; read _KEY
mount /dev/cdrom /mnt
cp /mnt/VMwareTools-* /tmp/vmtools.tar.gz
cd /tmp && tar -xzvf vmtools.tar.gz
/tmp/vmware-tools-distrib/vmware-install.pl
cd ~

## cloud-init
yum install -y cloud-init
systemctl disable cloud-init-local cloud-init cloud-config cloud-final
sed -i 's/disable_root: 1/disable_root: 0/g' /etc/cloud/cloud.cfg
sed -i 's/ssh_pwauth:   0/ssh_pwauth:   1/g' /etc/cloud/cloud.cfg
sed -i '/disable_vmware_customization: false/d' /etc/cloud/cloud.cfg
echo 'network: {config: disabled}' > /etc/cloud/cloud.cfg.d/99_network_disabled.cfg

# util for vra
## from base64 encoded; check "https://github.com/vmware-cmbu-seak/aria-automation/tree/main/images"
VRA_INIT_SVC="W1VuaXRdCkRlc2NyaXB0aW9uPXZSZWFsaXplIEF1dG9tYXRpb24gSW5pdCBTZXJ2aWNlCkFmdGVyPXZtd2FyZS10b29scy5zZXJ2aWNlCgpbU2VydmljZV0KVHlwZT1vbmVzaG90CkV4ZWNTdGFydD0vdXNyL2Jpbi92cmEtaW5pdApSZW1haW5BZnRlckV4aXQ9eWVzClRpbWVvdXRTZWM9MApLaWxsTW9kZT1wcm9jZXNzClRhc2tzTWF4PWluZmluaXR5ClN0YW5kYXJkT3V0cHV0PWpvdXJuYWwrY29uc29sZQoKW0luc3RhbGxdCldhbnRlZEJ5PW11bHRpLXVzZXIudGFyZ2V0"
VRA_INIT="IyEvYmluL2Jhc2gKQ0hFQ0tfTkVUV09SS19USUNLPTEKZnVuY3Rpb24gX2NoZWNrX25ldHdvcmsgewogICAgbG9jYWwgREVWX05BTUU9YGlwIGxpbmsgfCBncmVwICJeMjoiIHwgYXdrICd7cHJpbnQgJDJ9JyB8IHNlZCAtZSAncy86Ly9nJ2AKICAgIGlmIFsgLXogIiRERVZfTkFNRSIgXTsgdGhlbiByZXR1cm4gMTsgZmkKICAgIGlmIFsgLXogImBpcCBhZGRyIHNob3cgZGV2ICRERVZfTkFNRSB8IGdyZXAgImluZXQgIiB8IGF3ayAne3ByaW50ICQyfScgfCBzZWQgLWUgJ3MvXC8uXCsvL2cnYCIgXTsgdGhlbiByZXR1cm4gMTsgZmkKICAgIHJldHVybiAwCn0KZnVuY3Rpb24gY2hlY2tfbmV0d29yayB7CiAgICB3aGlsZSB0cnVlOyBkbwogICAgICAgIF9jaGVja19uZXR3b3JrCiAgICAgICAgaWYgWyAkPyA9PSAgMCBdOyB0aGVuIGJyZWFrOyBmaQogICAgICAgIHNsZWVwICRDSEVDS19ORVRXT1JLX1RJQ0sKICAgIGRvbmUKfQpmdW5jdGlvbiBfc3RhcnRfY2xvdWRfaW5pdCB7CiAgICAvdXNyL2Jpbi9jbG91ZC1pbml0IGluaXQgLS1sb2NhbAogICAgL3Vzci9iaW4vY2xvdWQtaW5pdCBpbml0CiAgICAvdXNyL2Jpbi9jbG91ZC1pbml0IG1vZHVsZXMgLS1tb2RlPWNvbmZpZwogICAgL3Vzci9iaW4vY2xvdWQtaW5pdCBtb2R1bGVzIC0tbW9kZT1maW5hbAp9CmZ1bmN0aW9uIHN0YXJ0X2Nsb3VkX2luaXQgewogICAgY2hlY2tfbmV0d29yawogICAgX3N0YXJ0X2Nsb3VkX2luaXQgMj4mMSA+L3Zhci9sb2cvY2xvdWQtaW5pdC5sb2cgJgp9CmlmIFsgLWYgL2V0Yy92cmEtcmVhZHkgXTsgdGhlbgogICAgaWYgWyAiT0siICE9ICIkKGNhdCAvZXRjL3ZyYS1yZWFkeSkiIF07IHRoZW4gc3RhcnRfY2xvdWRfaW5pdDsgZmkKICAgIGVjaG8gIk9LIiA+IC9ldGMvdnJhLXJlYWR5CmVsc2UKICAgIHRvdWNoIC9ldGMvdnJhLXJlYWR5CmZp"
VRA_READY="IyEvYmluL2Jhc2gKIyBFbmFibGUgdnJhLWluaXQKc3lzdGVtY3RsIGVuYWJsZSB2cmEtaW5pdAojIFJlbW92ZSB2cmEtaW5pdCBQaGFzZSBDaGVja2VyCnJtIC1yZiAvZXRjL3ZyYS1yZWFkeQojIFJlbW92ZSBVYnVudHUgTmV0d29yayBGaWxlcwpybSAtcmYgL2V0Yy9uZXR3b3JrL2ludGVyZmFjZXMKcm0gLXJmIC9ldGMvbmV0cGxhbi8qCiMgUmVtb3ZlIENlbnRPUyBOZXR3b3JrIEZJbGVzCnJtIC1yZiAvZXRjL3N5c2NvbmZpZy9uZXR3b3JrLXNjcmlwdHMvaWZjZmctKgojIFJlbW92ZSBDbG91ZCBpbml0IERhdGEKcm0gLXJmIC92YXIvbGliL2Nsb3VkLyoKIyBHZW5lcmFsIENsZWFyaW5nCi91c3IvYmluL2ltYWdlLWNsZWFyLXBvd2Vyb2Zm"
IMG_CL_PO="IyEvYmluL2Jhc2gKcm0gLXJmIC90bXAvKgpybSAtcmYgL3Zhci90bXAvKgpybSAtcmYgL3Zhci9sb2cvdm13YXJlLSoKcm0gLXJmIC92YXIvbG9nL2Nsb3VkLSoKZm9yIGZkIGluICQoZmluZCAvdmFyL2xvZyB8IGdyZXAgIi5neiIpOyBkbyBybSAtcmYgJGZkOyBkb25lCmZvciBmZCBpbiAkKGZpbmQgL3Zhci9sb2cgfCBncmVwICIudHoiKTsgZG8gcm0gLXJmICRmZDsgZG9uZQpmb3IgZmQgaW4gJChmaW5kIC92YXIvbG9nIHwgZ3JlcCAiLnppcCIpOyBkbyBybSAtcmYgJGZkOyBkb25lCmZvciBmZCBpbiAkKGZpbmQgL3Zhci9sb2cgfCBncmVwICIuYnoyIik7IGRvIHJtIC1yZiAkZmQ7IGRvbmUKcm0gLXJmIH4vLmJhc2hfaGlzdG9yeQpwb3dlcm9mZg=="
echo "$VRA_INIT_SVC" | base64 -d | tee /lib/systemd/system/vra-init.service > /dev/null
echo "$VRA_INIT" | base64 -d | tee /usr/bin/vra-init > /dev/null
echo "$VRA_READY" | base64 -d | tee /usr/bin/vra-ready > /dev/null
echo "$IMG_CL_PO" | base64 -d | tee /usr/bin/image-clear-poweroff > /dev/null
chmod 755 /usr/bin/vra-init /usr/bin/vra-ready /usr/bin/image-clear-poweroff
systemctl disable vra-init

# clear unusable packages
yum clean all

# finish
echo ""
echo "if want to make image to finalize"
echo "input command as followed"
echo ""
echo "  # vra-ready"
echo ""
echo "thanks"