# Build vSphere VM Template for Aria Automation

## Install Scripts

 - <a href="./centos8.sh">CentOS 8</a>
 - <a href="./ubuntu20.sh">Ubuntu 20</a>

## Admin Task When Day 2 Install/Update Software/Setting In Aria VM Images

 - Please clean garbage files such as pre-version packages

```
[ RHEL / CentOS / LockyOS ]
# yum clean all

[ Debian / Ubuntu ]
# apt autoremove
```
   
 - Be ensure to finish your task through typing such as following via root account

```
$ vra-ready
```

## "vra-init" <a href="./vra-init">Source Scripts</a>