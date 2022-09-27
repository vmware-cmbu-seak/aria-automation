if (subnetRangeLink === undefined || subnetRangeLink == null || subnetRangeLink == "") { return []; }

var vra = System.getModule("com.vmk").VraManager();
var ip = System.getModule("com.vmk.tool").Converter().ip;

var unAvailable = [];
for each(var ipAddress in vra.getUerp("/resources/ip-addresses?expand&$filter=((subnetRangeLink eq '" + subnetRangeLink + "') and (ipAddressStatus ne 'AVAILABLE'))").documents) {
    unAvailable.push(ip.getNumeric(ipAddress.ipAddress));
}
var subnetRange = vra.getUerp("/resources/subnet-ranges?expand&$filter=(documentSelfLink eq '" + subnetRangeLink + "')");
if (subnetRange.totalCount != 1) { throw "Error : could not find subnet range with link " + subnetRangeLink; }
subnetRange = subnetRange.documents[subnetRangeLink];
var ipNum = ip.getNumeric(subnetRange.startIPAddress);
var ipEnd = ip.getNumeric(subnetRange.endIPAddress);

var result = []
for (; ipNum <= ipEnd; ipNum++) {
    if (unAvailable.indexOf(ipNum) < 0) {
        result.push(ip.getString(ipNum));
    }
}
return result;