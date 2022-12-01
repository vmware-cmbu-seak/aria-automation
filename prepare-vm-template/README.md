# Build vSphere VM Template for Aria Automation

## Install Scripts

Making vm template is very important task for enabling whole AA feature and optimizing provision time.<br/>
These install scripts are consider

 - Fastest boot time options (adjust bootloader)
 - cloud-like user environment (garbage throttling)
 - Install VMware Tools (recommended latest version of official VMTools lather than open-source version)
 - Install "vra-init" service (described below)

**Scripts Links**

 - <a href="./images/centos8.sh">CentOS 8</a>
 - <a href="./images/ubuntu20.sh">Ubuntu 20</a>

Scripts can be done "just run", however recommended executing line by line. because all environments has exceptions.

## Admin Task When Day 2 Install/Update Software/Setting In Aria VM Templates

**Please clean garbage files such as pre-version packages**

```
[ RHEL / CentOS / LockyOS ]
# yum clean all

[ Debian / Ubuntu ]
# apt autoremove
```
   
**Be ensure to finish your task through typing such as following via root account**

```
$ vra-ready
```

## vra-init

The "vra-init" service is for "cloud-init" agent which working with AA's static IP feature.<br/>
Generally, "cloud-init" agent does not working when "assignment" property is "static" in VM resource of AA's cloud templates.<br/>

**Reason why.**

 - Static IP assignment use vsphere "customization spec".
 - When first boot up, VMtools turn on NICs, its status makes "system-networkd" service to running.
 - "cloud-init" agent service is started after running "system-networkd" service.
 - "customization spec" make vm to reboot for network configurations.
 - "cloud-init" agent service is interrupted by VM reboot. However "cloud-init" status is memorized to already executed in first bootstrap.
 - After reboot, "cloud-init" agent service could not run, because this phase is not first bootstrap.

**To Resolve**

 - "cloud-init" agent service must be run after rebooting which triggered by "customization spec".
 - "vra-init" service will check current boot status and execute "cloud-init".

<a href="./vra-init">"vra-init" Source Scripts</a>