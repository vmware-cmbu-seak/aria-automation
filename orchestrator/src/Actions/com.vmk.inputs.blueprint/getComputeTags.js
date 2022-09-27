if (zoneId === undefined || zoneId == null || zoneId == "null" || zoneId == "") {
    if (defaultValue !== undefined && defaultValue != null && defaultValue != "null") {
        return [defaultValue];
    }
    return [];
}

var vra = System.getModule("com.vmk").VraManager();

var result = [];
for each(var compute in vra.get("/iaas/api/zones/" + zoneId + "/computes").content) {
    for each(var tag in compute.tags) {
        var fullTag = tag.key + ":" + tag.value;
        if (result.indexOf(fullTag) < 0) {
            result.push(fullTag);
        }
    }
}
result.sort();
if (defaultValue !== undefined && defaultValue != null && defaultValue != "null") {
    result.push(defaultValue);
}

return result;