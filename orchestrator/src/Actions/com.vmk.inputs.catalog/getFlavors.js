var vra = System.getModule("com.vmk").VraManager();

var names = [];
var specs = [];
for each(var flavor in vra.get("/iaas/api/flavors").content) {
    for (var flavorName in flavor.mapping) {
        var flavorSize = flavor.mapping[flavorName];
        var index = names.indexOf(flavorName);
        if (index < 0) {
            names.push(flavorName);
            specs.push({
                name: flavorName,
                cpuCount: flavorSize.cpuCount,
                memoryInMB: flavorSize.memoryInMB,
                compare: (flavorSize.cpuCount * 10000000) + flavorSize.memoryInMB
            });
        } else {
            if (flavorSize.cpuCount > specs[index].cpuCount) {
                specs[index].cpuCount = flavorSize.cpuCount;
                specs[index].memoryInMB = flavorSize.memoryInMB;
                specs[index].compare = (flavorSize.cpuCount * 10000000) + flavorSize.memoryInMB;
            } else if (flavorSize.cpuCount == specs[index].cpuCount && flavorSize.memoryInMB > specs[index].memoryInMB) {
                specs[index].memoryInMB = flavorSize.memoryInMB;
                specs[index].compare = (flavorSize.cpuCount * 10000000) + flavorSize.memoryInMB;
            }
        }
    }
}

specs.sort(function (a, b) { return a.compare - b.compare; });
var result = [];
for each(var spec in specs) {
    result.push({
        label: spec.name + " (" + spec.cpuCount + "Core / " + spec.memoryInMB + "MByte)",
        value: spec.name
    });
}
return result;