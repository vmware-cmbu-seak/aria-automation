if (zoneId === undefined || zoneId == null || zoneId == "") { return []; }

var vra = System.getModule("com.vmk").VraManager();

var tags = [];
var names = [];
function getTagsFromNetProfile(netProfs) {
    for each(var netProf in netProfs) {
        for each(var subnet in netProf.subnets) {
            for each(var tag in subnet.expandedTags) {
                var fullTag;
                if (tag.tag.indexOf("\n") > -1) {
                    var splitTag = tag.tag.split("\n");
                    fullTag = splitTag[0] + ":" + splitTag[1];
                } else {
                    fullTag = tag.tag;
                }
                var index = tags.indexOf(fullTag);
                if (index < 0) {
                    tags.push(fullTag);
                    names.push([subnet.name]);
                } else {
                    names[index].push(subnet.name);
                }
            }
        }
    }
}

var netProfs = vra.getUerp("/provisioning/mgmt/network-profile?expand&$filter=(placementZoneLink eq '/provisioning/resources/placement-zones/" + zoneId + "')");
if (netProfs.totalCount == 0) {
    netProfs = vra.getUerp("/provisioning/mgmt/network-profile?expand&$filter=(provisioningRegionLink eq '" + vra.getUerp("/provisioning/resources/placement-zones/" + zoneId).provisioningRegionLink + "')");
    if (netProfs.totalCount == 0) {
        throw "Error : could not find network profile";
    }
}
getTagsFromNetProfile(netProfs.documents);

var resultOne = [];
var resultAny = [];
for (var index = 0; index < tags.length; index++) {
    if (names[index].length == 1) {
        resultOne.push(new Properties({
            label: names[index][0],
            value: tags[index]
        }));
    } else {
        var joinedNames = names[index].sort().join(",");
        var hasSame = false;
        for (var nindex = 0; nindex < names.length; nindex++) {
            if (nindex != index && names[nindex].join(",") == joinedNames) {
                if (index > nindex) { hasSame = true; }
                break;
            }
        }
        if (!hasSame) {
            resultAny.push(new Properties({
                label: "Any Of " + names[index].length + " Networks",
                value: tags[index]
            }));
        }
    }
}

resultOne.sort(function (a, b) { return a.label.localeCompare(b.label); });
resultAny.sort(function (a, b) { return a.label.localeCompare(b.label); });
var result = [];
for each(var val in resultAny) { result.push(val); }
for each(var val in resultOne) { result.push(val); }
return result;