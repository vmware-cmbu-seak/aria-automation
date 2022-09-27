var vra = System.getModule("com.vmk").VraManager();

if (ipAddress !== undefined && ipAddress != null && ipAddress != ""
    && subnetRangeLink !== undefined && subnetRangeLink != null && subnetRangeLink != ""
    && networkInterfaceLink !== undefined && networkInterfaceLink != null && networkInterfaceLink != "") { // allocate task

    var networkInterface = vra.getUerp("/resources/network-interfaces?expand&$filter=(documentSelfLink eq '" + networkInterfaceLink + "')");
    if (networkInterface.totalCount != 1) { throw "Error : could not find network interface with link " + networkInterfaceLink; }
    networkInterface = networkInterface.documents[networkInterfaceLink];

    var subnetRange = vra.getUerp("/resources/subnet-ranges?expand&$filter=(documentSelfLink eq '" + subnetRangeLink + "')");
    if (subnetRange.totalCount != 1) { throw "Error : could not find subnet range with link " + subnetRangeLink; }
    subnetRange = subnetRange.documents[subnetRangeLink];

    var subNetwork = vra.getUerp("/resources/sub-networks?expand&$filter=(documentSelfLink eq '" + subnetRange.subnetLink + "')");
    if (subNetwork.totalCount != 1) { throw "Error : could not find sub network with link " + subnetRange.subnetLink; }
    subNetwork = subNetwork.documents[subnetRange.subnetLink];

    var check_ip = vra.getUerp("/resources/ip-addresses?expand&$filter=((subnetRangeLink eq '" + subnetRangeLink + "') and (ipAddress eq '" + ipAddress + "'))");
    var ipAddressObj;
    if (check_ip.totalCount == 0) {
        ipAddressObj = vra.post("/provisioning/uerp/resources/ip-addresses", {
            "customProperties": {},
            "ipAddress": ipAddress,
            "ipAddressStatus": "ALLOCATED",
            "subnetRangeLink": subnetRangeLink,
            "connectedResourceLink": networkInterfaceLink
        });
    } else if (check_ip.totalCount == 1) {
        var ipAddressLink = check_ip.documentLinks[0];
        ipAddressObj = check_ip.documents[ipAddressLink];
        if (ipAddressObj.ipAddressStatus == "AVAILABLE") {
            ipAddressObj.ipAddressStatus = "ALLOCATED";
            ipAddressObj.connectedResourceLink = networkInterfaceLink;
            ipAddressObj = vra.patch("/provisioning/uerp" + ipAddressLink, ipAddressObj);
        } else {
            throw "Error : ip address is not available status";
        }
    } else {
        throw "Error : ip addresses are retrieved more 1";
    }

    var is_networkInterface_updated = false;
    if (networkInterface.name.indexOf("Network adapter") > -1) {
        var index = Number(networkInterface.name.split(" ")[2]) - 1;
        networkInterface.name = subNetwork.name;
        networkInterface.deviceIndex = index;
        is_networkInterface_updated = true;
    }
    if (networkInterface.addressLinks === undefined) {
        networkInterface.addressLinks = [ipAddressObj.documentSelfLink];
        networkInterface.address = ipAddress;
        is_networkInterface_updated = true;
    }
    if (networkInterface.subnetLink != subnetRange.subnetLink) {
        networkInterface.subnetLink = subnetRange.subnetLink;
        is_networkInterface_updated = true;
    }
    if (is_networkInterface_updated) { vra.put("/provisioning/uerp" + networkInterface.documentSelfLink, networkInterface); }
}

if (clearAvailable == true || clearReleased == true || (clearAddresses !== undefined && clearAddresses != null && clearAddresses.length > 0)) {
    var ip_addresses = vra.get("/provisioning/uerp/resources/ip-addresses?expand").documents;
    var is_address = (clearAddresses !== undefined && clearAddresses != null && clearAddresses.length > 0) ? true : false;
    for (var ip_address_path in ip_addresses) {
        var ip_address = ip_addresses[ip_address_path];
        if (is_address && (clearAddresses.indexOf(ip_address.ipAddress) > -1)) {
            vra.delete("/provisioning/uerp" + ip_address_path);
            System.log("IP Removed : " + ip_address.ipAddress);
        } else if ((clearAvailable == true && ip_address.ipAddressStatus == "AVAILABLE") || (clearReleased == true && ip_address.ipAddressStatus == "RELEASED")) {
            vra.delete("/provisioning/uerp" + ip_address_path);
            System.log("IP Removed : " + ip_address.ipAddress);
        }
    }
}

var deploymentId = System.getContext().getParameter("__metadata_deploymentId");
if (deploymentId != undefined && deploymentId != null) { vra.deployments(deploymentId).deleteAfterSec(600); }