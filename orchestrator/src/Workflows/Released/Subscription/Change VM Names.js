var customProperties = inputProperties.customProperties;
if (customProperties.clusterName !== undefined
&& customProperties.clusterName != null
&& customProperties.clusterName != ""
&& customProperties.count !== undefined
&& customProperties.count != null) {
    var vra = System.getModule("com.vmk").VraManager();
    var clusterName = customProperties.clusterName;
    var deploymentId = inputProperties.deploymentId;
    var resourceId = inputProperties.resourceIds[0];

    var resources = vra.get("/deployment/api/deployments/" + deploymentId + "/resources").content;
    var count = [];
    for each(var resource in resources) {
        var properties = resource.properties;
        if (properties.resourceDescLink.indexOf(resourceId) > -1) {
            count.push(Number(properties.countIndex) + 1);
        }
    }

    function zfill(number, width) {
        width -= number.toString().length;
        if (width > 0) {
            return new Array(width + (/\./.test(number) ? 2 : 1)).join("0") + number;
        }
        return number + "";
    }

    resourceNames = new Array();
    var index = 0;
    for each(var resource in inputProperties.resourceNames) {
        while (true) {
            index += 1;
            if (count.indexOf(index) < 0) {
                resourceNames.push(clusterName + "-" + zfill(index, zfillCount));
                break;
            }
        }
    }
} else {
    resourceNames = inputProperties.resourceNames;
}