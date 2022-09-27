var vra = System.getModule("com.vmk").VraManager();

var result = [];
for each(var image in vra.get("/iaas/api/images").content) {
    for (var imageName in image.mapping) {
        if (result.indexOf(imageName) < 0) {
            result.push(imageName);
        }
    }
}
result.sort();
if (defaultValue !== undefined && defaultValue != null && defaultValue != "null") {
    result.push(defaultValue);
}
return result;