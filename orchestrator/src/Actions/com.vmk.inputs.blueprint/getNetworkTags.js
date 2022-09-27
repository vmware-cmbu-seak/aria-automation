if (zoneId === undefined || zoneId == null || zoneId == "null" || zoneId == "") {
    if (defaultValue !== undefined && defaultValue != null && defaultValue != "null") {
        return [defaultValue];
    }
    return [];
}

var vra = System.getModule("com.vmk").VraManager();

var netProfs = vra.getUerp("/provisioning/mgmt/network-profile?expand&$filter=(placementZoneLink eq '/provisioning/resources/placement-zones/" + zoneId + "')");
if (netProfs.totalCount == 0) {
    netProfs = vra.getUerp("/provisioning/mgmt/network-profile?expand&$filter=(provisioningRegionLink eq '" + vra.getUerp("/provisioning/resources/placement-zones/" + zoneId).provisioningRegionLink + "')");
    if (netProfs.totalCount == 0) {
        throw "Error : could not find network profile";
    }
}
var result = [];
for each(var netProf in netProfs.documents) {
    for each(var subnet in netProf.subnets) {
        for each(var tag in subnet.expandedTags) {
            var fullTag;
            if (tag.tag.indexOf("\n") > -1) {
                var splitTag = tag.tag.split("\n");
                fullTag = splitTag[0] + ":" + splitTag[1];
            } else {
                fullTag = tag.tag;
            }
            if (result.indexOf(fullTag) < 0)  {
                result.push(fullTag);
            }
        }
    }
}
result.sort();
if (defaultValue !== undefined && defaultValue != null && defaultValue != "null") {
    result.push(defaultValue);
}

return result;