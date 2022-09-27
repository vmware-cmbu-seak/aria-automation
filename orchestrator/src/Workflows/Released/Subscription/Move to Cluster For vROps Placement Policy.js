
vm = null;
resourcePool = null;

var placementPolicy = inputProperties["customProperties"]["placementPolicy"];
if (placementPolicy !== undefined && placementPolicy != null && (placementPolicy == true || placementPolicy == "true")) {
    var vmName = inputProperties["resourceNames"][0];
    var vmId = inputProperties["resourceIds"][0];
    var vra = System.getModule("com.vmk").VraManager();
    var endpoint = vra.getUerp(vra.getUerp("/resources/compute/" + vmId).endpointLink);
    if (endpoint.endpointType == "vsphere") {
        var vmList = VcPlugin.getAllVirtualMachines(null, vmName);
        if (vmList.length == 1) { vm = vmList[0]; }
        else if (vmList.length > 1) {
            var matched = false;
            for each(var v in vmList) {
                if (v.name == vmName && v.vimHost.name.indexOf(endpoint.endpointProperties.hostName) > -1) {
                    vm = v;
                    matched = true;
                    break;
                }
            }
            if (!matched) {
                throw "Error : could not find machine on vsphere";
            }
        } else {
            throw "Error : could not find machine on vsphere";
        }

        var ref = vm.resourcePool;
        while (true) {
            if (ref != null && ref.parent != null && ref.parent.vimType == "ClusterComputeResource") {
                resourcePool = ref; // Cluster's Resources : ResourcePool
                System.log("RP : " + resourcePool.name);
                break;
            } else if (ref == null) {
                throw "Error : could not find cluster";
            }
            ref = ref.parent;
        }
    }
}

// + "Move virtual machine to resource pool" Workflow