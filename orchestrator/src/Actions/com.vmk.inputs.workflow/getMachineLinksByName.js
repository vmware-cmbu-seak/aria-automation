if (name === undefined || name == null || name == "" || name.length < 3) { return []; }

var vra = System.getModule("com.vmk").VraManager();

var results = [];
var machines = vra.getUerp("/resources/compute?expand&$filter=((type eq 'VM_GUEST') and (name eq '*" + name + "*'))").documents;
for (var link in machines) {
    results.push(new Properties({
        label: machines[link].name,
        value: link
    }));
}
results.sort(function (a, b) { return a.label.localeCompare(b.label); });
return results;