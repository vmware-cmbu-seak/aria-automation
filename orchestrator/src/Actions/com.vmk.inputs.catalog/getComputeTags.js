if (zoneId === undefined || zoneId == null || zoneId == "") { return []; }

var vra = System.getModule("com.vmk").VraManager();

var tags = [];
var names = [];
for each(var compute in vra.get("/iaas/api/zones/" + zoneId + "/computes").content) {
    for each(var tag in compute.tags) {
        var fullTag = tag.key + ":" + tag.value;
        var index = tags.indexOf(fullTag);
        if (index < 0) {
            tags.push(fullTag);
            names.push([compute.name]);
        } else {
            names[index].push(compute.name);
        }
    }
}


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
                label: "Any Of " + names[index].length + " Placements",
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