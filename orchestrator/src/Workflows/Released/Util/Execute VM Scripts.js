if (vmObj !== undefined && vmObj != null) {
    output = System.getModule("com.vmk").VcsaManager().vm(vmObj).execScripts(username, password, scripts);
} else if (vmName !== undefined && vmName != null && vmName != "") {
    output = System.getModule("com.vmk").VcsaManager().vm(vmName).execScripts(username, password, scripts);
} else if (vmLink !== undefined && vmLink != null && vmLink != "") {
    output = System.getModule("com.vmk").VraManager().machines(vmLink).execScripts(username, password, scripts);
}