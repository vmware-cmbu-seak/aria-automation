if (zoneId === undefined || zoneId == null || zoneId == "null" || zoneId == "") {
    if (defaultValue !== undefined && defaultValue != null && defaultValue != "null") {
        return [defaultValue];
    }
    return [];
}
if (networkTag === undefined || networkTag == null || networkTag == "null" || networkTag == "") {
    if (defaultValue !== undefined && defaultValue != null && defaultValue != "null") {
        return [defaultValue];
    }
    return [];
}
var tagUrl = "/provisioning/mgmt/tags?$filter=";
if (networkTag.indexOf(":") > -1) {
    var tag = networkTag.split(":");
    tagUrl += "((key eq '" + tag[0] + "') and (value eq '" + tag[1] + "'))";
} else {
    tagUrl += "(key eq '" + networkTag + "')"
}

var vra = System.getModule("com.vmk").VraManager();
var ip = System.getModule("com.vmk.tool").Converter().ip;

var netProfs = vra.getUerp("/provisioning/mgmt/network-profile?expand&$filter=(placementZoneLink eq '/provisioning/resources/placement-zones/" + zoneId + "')");
if (netProfs.totalCount == 0) {
    netProfs = vra.getUerp("/provisioning/mgmt/network-profile?expand&$filter=(provisioningRegionLink eq '" + vra.getUerp("/provisioning/resources/placement-zones/" + zoneId).provisioningRegionLink + "')");
    if (netProfs.totalCount == 0) {
        throw "Error : could not find network profile";
    }
}
var zoneSubnetLinks = [];
for each(var netProf in netProfs.documents) {
    zoneSubnetLinks = zoneSubnetLinks.concat(netProf.subnetLinks);
}

var subnetLinks = [];
for each(var tagLink in vra.getUerp(tagUrl).documentLinks) {
    for each(var subnetLink in vra.getUerp("/provisioning/mgmt/tag-usage?tagLinks=" + tagLink).documentLinks) {
        if (zoneSubnetLinks.indexOf(subnetLink) > -1) {
            subnetLinks.push(subnetLink);
        }
    }
}
if (subnetLinks.length != 1) {
    if (defaultValue !== undefined && defaultValue != null && defaultValue != "null") {
        return [defaultValue];
    }
    return [];
}
var subnetLink = subnetLinks[0];
var unAvailable = [];
var ipNums = []

for each(var subnetRange in vra.getUerp("/resources/subnet-ranges?expand").documents) {
    if (subnetRange.subnetLinks.indexOf(subnetLink) > -1) {
        var subnetRangeLink = subnetRange.documentSelfLink;
        for each(var ipAddress in vra.getUerp("/resources/ip-addresses?expand&$filter=((subnetRangeLink eq '" + subnetRangeLink + "') and (ipAddressStatus ne 'AVAILABLE'))").documents) {
            unAvailable.push(ip.getNumeric(ipAddress.ipAddress));
        }
        var ipNum = ip.getNumeric(subnetRange.startIPAddress);
        var ipEnd = ip.getNumeric(subnetRange.endIPAddress);
        for (; ipNum <= ipEnd; ipNum++) {
            if (unAvailable.indexOf(ipNum) < 0) {
                ipNums.push(ipNum);
            }
        }
    }
}

var result = [];
for each(var ipNum in ipNums.sort()) {
    result.push(ip.getString(ipNum));
}
if (defaultValue !== undefined && defaultValue != null && defaultValue != "null") {
    result.push(defaultValue);
}

return result;