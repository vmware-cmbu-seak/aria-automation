var vra = System.getModule("com.vmk").VraManager();

var result = [];
for each(var flavor in vra.get("/iaas/api/flavors").content) {
    for (var flavorName in flavor.mapping) {
        if (result.indexOf(flavorName) < 0) {
            result.push(flavorName);
        }
    }
}
result.sort();
if (defaultValue !== undefined && defaultValue != null && defaultValue != "null") {
    result.push(defaultValue);
}

return result;