if (projectId === undefined || projectId == null || projectId == "") { return []; }

var vra = System.getModule("com.vmk").VraManager();
var projectName = vra.get("/iaas/api/projects/" + projectId).name;

var result = [];
for each(var content in vra.get("/codestream/api/endpoints?$filter=((project eq '" + projectName + "') and (type eq 'k8s'))").documents) {
    result.push(content.name);
}
result.sort();
return result;