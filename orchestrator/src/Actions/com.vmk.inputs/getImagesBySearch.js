var vra = System.getModule("com.vmk").VraManager();

var result = [];
for each(var image in vra.get("/iaas/api/images").content) {
    for (var imageName in image.mapping) {
        if (result.indexOf(imageName) < 0) {
            if (imageName.indexOf(keyword) > -1) {
                result.push(imageName);
            }
            
        }
    }
}
result.sort();
return result;