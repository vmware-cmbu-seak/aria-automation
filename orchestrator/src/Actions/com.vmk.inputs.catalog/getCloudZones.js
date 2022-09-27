if (projectId === undefined || projectId == null || projectId == "") { return []; }

var vra = System.getModule("com.vmk").VraManager();
var result = [];
for each(var zone in vra.get("/iaas/api/projects/" + projectId).zones) {
    zone = vra.get("/iaas/api/zones/" + zone.zoneId);
    result.push({
        label: zone.name,
        value: zone.id 
    });
}

return result;