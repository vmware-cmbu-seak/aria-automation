var vra = System.getModule("com.vmk").VraManager();
var projectId = project.id;

for each(var file in Server.getResourceElementCategoryWithPath(basePath).resourceElements) {
    var name = System.extractFileNameWithoutExtension(file.name);
    var content = file.getContentAsMimeAttachment().content;
    var res = vra.get("/blueprint/api/blueprints?name=" + name).content;
    if (res.length == 0) {
        vra.post("/blueprint/api/blueprints", {
            projectId: projectId,
            name: name,
            requestScopeOrg: true,
            content: content
        });
    } else if (res.length == 1) {
        res = res[0]
        vra.put("/blueprint/api/blueprints/" + res.id, {
            projectId: projectId,
            name: name,
            requestScopeOrg: true,
            content: content
        });
    } else {
        throw "Error: could not install blueprint: " + name;
    }
}
