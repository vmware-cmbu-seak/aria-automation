if (vmObj !== undefined && vmObj != null) {
    output = System.getModule("com.vmk").VcsaManager().vm(vmObj).deployFiles(username, password, source, target);
} else if (vmName !== undefined && vmName != null && vmName != "") {
    output = System.getModule("com.vmk").VcsaManager().vm(vmName).deployFiles(username, password, source, target);
} else if (vmLink !== undefined && vmLink != null && vmLink != "") {
    output = System.getModule("com.vmk").VraManager().machines(vmLink).deployFiles(username, password, source, target);
}