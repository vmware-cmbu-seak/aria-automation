var vra = System.getModule("com.vmk").VraManager();

try {
    var deploymentId = null;
    var resources = vra.get("/deployment/api/resources?search=" + vm.name + "&expand=deployment").content;
    for each(var resource in resources) {
        if (resource.name == vm.name && resource.type.indexOf("Machine") > -1) {
            deploymentId = resource.deployment.id;
            break
        }
    }
    if (deploymentId == null) { throw "could not find deploymentId"; }
    var deployment = vra.deployments(deploymentId);
    var count = deployment.inputs[counterName];
    var inputs = {};
    count = count + quantity;
    inputs[counterName] = count;
    deployment.update(inputs);
    System.log("change scale count from vrops scale out event: " + count);
} catch (e) { System.log(e); }