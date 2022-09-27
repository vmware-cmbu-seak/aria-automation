if (projectId === undefined || projectId == null || projectId == "") { return ""; }

var vra = System.getModule("com.vmk").VraManager();
var project = vra.get("/iaas/api/projects/" + projectId);
return project.name;