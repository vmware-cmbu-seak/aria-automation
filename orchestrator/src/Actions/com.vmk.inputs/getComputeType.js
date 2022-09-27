if (zoneId === undefined || zoneId == null || zoneId == "null" || zoneId == "") { return ""; }

var vra = System.getModule("com.vmk").VraManager();

switch (vra.get("/iaas/api/cloud-accounts/" + vra.get("/iaas/api/zones/" + zoneId).cloudAccountId).cloudAccountType) {
    case "vsphere": return "vmw";
    case "aws": return "aws";
    case "azure": return "azr";
    case "gcp": return "gcp";
    default: return "";
}