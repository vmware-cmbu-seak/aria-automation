if (networkInterfaceLink === undefined || networkInterfaceLink == null || networkInterfaceLink == "") { return []; }

var vra = System.getModule("com.vmk").VraManager();

var networkInterface = vra.getUerp("/resources/network-interfaces?expand&$filter=(documentSelfLink eq '" + networkInterfaceLink + "'");
if (networkInterface.totalCount != 1) { throw "Error : could not find network interface with link " + networkInterfaceLink; }
var subNetworkLink = networkInterface.documents[networkInterfaceLink].subnetLink;
var subNetwork = vra.getUerp("/resources/sub-networks?expand&$filter=(documentSelfLink eq '" + subNetworkLink + "')");
if (subNetwork.totalCount != 1) { throw "Error : could not find sub network with link " + subNetworkLink; }
subNetwork = subNetwork.documents[subNetworkLink];
if (subNetwork.subnetCIDR === undefined) {
    var subNetworks = vra.getUerp("/resources/sub-networks?expand&$filter=(name eq '" + subNetwork.name + "')");
    subNetwork = null;
    for each(subNetworkLink in subNetworks.documentLinks) {
        if (subNetworks.documents[subNetworkLink].subnetCIDR !== undefined) {
            subNetwork = subNetworks.documents[subNetworkLink];
            break;
        }
    }
    if (subNetwork == null) {
        throw "Error : could not find available sub network with network interface link " + networkInterfaceLink;
    }
}

var subnetRanges = vra.getUerp("/resources/subnet-ranges?expand&$filter=(subnetLink eq '" + subNetworkLink + "')");
var result = [];
for each(var subnetRangeLink in subnetRanges.documentLinks) {
    var subnetRange = subnetRanges.documents[subnetRangeLink];
    result.push({
        label: subnetRange.name + " [" + subnetRange.startIPAddress + "~" + subnetRange.endIPAddress + "]",
        value: subnetRangeLink
    })
}
return result;