if (projectId === undefined || projectId == null || projectId == "null" || projectId == "") { return [""]; }

var vra = System.getModule("com.vmk").VraManager();
var result = [];
for each(var zone in vra.get("/iaas/api/projects/" + projectId).zones) {
    result.push(zone.zoneId);
}
if (defaultValue !== undefined && defaultValue != null && defaultValue != "null") {
    result.push(defaultValue);
}

return result;