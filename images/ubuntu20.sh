#!/bin/bash
# must be run as root
# must be run with image "ubuntu-20.04.X-live-server-amd64.iso"
# must be confirmed script sequence before running

# required
DNS=""						# set your dns server
NTP=""						# set your ntp server

# optional
SWAP_OFF=true				# set swap fs off
SNAP_OFF=true				# set snap fs off
REPO_PATH=""				# set your repository
REPO_UPGRADE=true			# trigger upgrade task
SSL_PUB_KEY=""				# set your master public ssh key
TIME_ZONE="Asia/Seoul"		# set your timezone

# 1. remove non-cloudic packages

## swap system off
if [ $SWAP_OFF == true ]; then
swapoff -a
rm -rf /swap.img
sed -i '/swap/d' /etc/fstab
fi

## snap system off
if [ $SNAP_OFF == true ]; then
for snap in $(df | grep snap | awk '{print $6}'); do
	umount $snap
done
fi

## remove package from apt
systemctl disable cloud-init-local cloud-init cloud-config cloud-final ufw open-vm-tools
systemctl stop cloud-init-local cloud-init cloud-config cloud-final ufw open-vm-tools
apt purge -f -y snapd cloud-init ufw open-vm-tools
apt autoremove -y
rm -rf /root/snap /etc/cloud /var/lib/cloud /etc/ufw

# upgrade && install basic packages
if [ $REPO_UPGRADE == true ]; then
apt update && apt upgrade -y
fi
apt install -y net-tools

# settings
## grub bootloader
sed -i 's/GRUB_CMDLINE_LINUX_DEFAULT="maybe-ubiquity"/GRUB_CMDLINE_LINUX_DEFAULT="quiet noresume"/g' /etc/default/grub
update-grub

## ssh
sed -i 's/#PermitRootLogin prohibit-password/PermitRootLogin yes/g' /etc/ssh/sshd_config
sed -i 's/#ClientAliveInterval 0/ClientAliveInterval 300/g' /etc/ssh/sshd_config
sed -i 's/#ClientAliveCountMax 3/ClientAliveCountMax 12/g' /etc/ssh/sshd_config
echo '    StrictHostKeyChecking no' >> /etc/ssh/ssh_config
echo '    UserKnownHostsFile /dev/null' >> /etc/ssh/ssh_config
mkdir -p /root/.ssh
if [ -n "$SSL_PUB_KEY" ]; then
	echo "$SSL_PUB_KEY" >> /root/.ssh/authorized_keys
	chmod 600 /root/.ssh/authorized_keys
fi
systemctl restart ssh

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
	sed -i "s/#NTP=/NTP=$NTP/g" /etc/systemd/timesyncd.conf
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
apt install -y cloud-init
systemctl disable cloud-init-local cloud-init cloud-config cloud-final
sed -i 's/disable_root: true/disable_root: false/g' /etc/cloud/cloud.cfg
sed -i 's/preserve_hostname: false/preserve_hostname: true/g' /etc/cloud/cloud.cfg
sed -i '/   package_mirrors:/,/   ssh_svcname: ssh/d' /etc/cloud/cloud.cfg
cat <<EOF>> /etc/cloud/cloud.cfg
   package_mirrors:
     - arches: [i386, amd64]
       failsafe:
         primary: $REPO/ubuntu
         security: $REPO/ubuntu
       search:
         primary:
           - $REPO/ubuntu/
         security:
           - $REPO/ubuntu/
   ssh_svcname: ssh
EOF
echo 'network: {config: disabled}' > /etc/cloud/cloud.cfg.d/99_network_disabled.cfg

# vra-init
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
apt autoremove -y

# finish
echo ""
echo "if want to make image to finalize"
echo "input command as followed"
echo ""
echo "  # vra-ready"
echo ""
echo "thanks"