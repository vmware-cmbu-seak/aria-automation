if (machineLink === undefined || machineLink == null || machineLink == "") { return []; }

var vra = System.getModule("com.vmk").VraManager();

var machine = vra.getUerp("/resources/compute?expand&$filter=(documentSelfLink eq '" + machineLink + "')");
if (machine.totalCount != 1) { throw "Error : could not find machine with link " + machineLink; }

var result = [];
for each(var networkInterfaceLink in machine.documents[machineLink].networkInterfaceLinks) {
    var networkInterface = vra.getUerp("/resources/network-interfaces?expand&$filter=(documentSelfLink eq '" + networkInterfaceLink + "')");
    if (networkInterface.totalCount != 1) { throw "Error : could not find network interface of machine link " + machineLink; }
    networkInterface = networkInterface.documents[networkInterfaceLink];
    result.push(new Properties({
        label: "[" + networkInterface.deviceIndex + "] " + networkInterface.customProperties.mac_address,
        value: networkInterfaceLink
    }));
}
return result;