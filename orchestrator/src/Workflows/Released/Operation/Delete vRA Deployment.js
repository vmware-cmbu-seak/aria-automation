var vra = System.getModule("com.vmk").VraManager();
var dep = vra.deployments(deploymentId);
dep.delete();