return {
    vm: function (vm) {
        if (vm === undefined || vm == null || vm == "") { throw "Error [VcsaManager.vm()] : must be set vm parameter"; }
        var vmObj;
        switch (typeof vm) {
            case "string":
                vmObj = VcPlugin.getAllVirtualMachines(null, vm);
                if (vmObj.length == 1) {
                    vmObj = vmObj[0];
                } else {
                    throw "Error [VcsaManager.vm(" + vm + ")] : could not find virtual machine or not unique";
                }
                break;
            case "function":
                vmObj = vm;
                break;
            default:
                throw "Error [VcsaManager.vm()] : could not recognize vm parameter" 
        }
        return {
            obj: vmObj,
            name: vmObj.name,
            execScripts: function (username, password, scripts) {
                var vcsa = System.getModule("com.vmk").ConfManager().load("VMK/VcsaManager/" + this.obj.vimHost.id);
                try {
                    return System.getModule("com.vmk.driver").execScripts(vcsa.host, vcsa.username, vcsa.password, this.name, username, password, scripts);
                } catch (e) {
                    throw "Error [VcsaManager.vm(" + this.name + ").execScripts()] : could not execute scripts : " + e;
                }
            },
            deployFiles: function (username, password, source, target) {
                if (source[0] == "/") { source = source.substring(1); }
                var result = [];
                var tmpDir = System.getTempDirectory();
                var fileManager = this.obj.sdkConnection.guestOperationsManager.fileManager;
                var attr = new VcGuestFileAttributes();
                var auth = new VcNamePasswordAuthentication();
                auth.username = username;
                auth.password = password;
                var vcVirtualMachine = this.obj;

                function deployResource(file, path) {
                    var tmpPath = tmpDir + "/" + System.nextUUID();
                    var paths = path.split("/");
                    paths.splice(paths.length - 1, 1);
                    var parentPath = paths.join("/");
                    file.writeContentToFile(tmpPath);
                    var fd = new File(tmpPath);
                    try {
                        try { fileManager.makeDirectoryInGuest(vcVirtualMachine, auth, parentPath, true); } catch (e) {}
                        fileManager.putFile(tmpPath, fileManager.initiateFileTransferToGuest(vcVirtualMachine, auth, path, attr, fd.length, true));
                    } catch (e) {
                        fd.deleteFile();
                        throw "Error [VcsaManager.vm(" + vcVirtualMachine.Name + ").deployFiles()] : could not deploy file :" + path + " : " + e;
                    }
                    fd.deleteFile();
                    result.push(path);
                    System.log("Deploy File : " + file.name + " >> " + vcVirtualMachine.Name + ":" + path);
                }

                function traceRecursive(catRef, path) {
                    for each(var subCategory in catRef.subCategories) {
                        traceRecursive(subCategory, path + "/" + subCategory.name);
                    }
                    for each(var resourceElement in catRef.resourceElements) {
                        deployResource(resourceElement, path + "/" + resourceElement.name);
                    }
                }
                
                var resource = null;
                var category = Server.getResourceElementCategoryWithPath(source);
                if (category == null) {
                    var categoryPath = source.split("/");
                    var resourceName = categoryPath[categoryPath.length - 1];
                    categoryPath.splice(categoryPath.length - 1, 1);
                    categoryPath = categoryPath.join("/");
                    category = Server.getResourceElementCategoryWithPath(categoryPath);
                    if (category == null) {
                        throw "Error [VcsaManager.vm(" + vcVirtualMachine.Name + ").deployFiles()] : could not find source : " + source;
                    }
                    for each(var resourceElement in category.resourceElements) {
                        if (resourceElement.name == resourceName) {
                            resource = resourceElement;
                            break;
                        }
                    }
                    if (resource == null) {
                        throw "Error [VcsaManager.vm(" + vcVirtualMachine.Name + ").deployFiles()] : could not find source : " + source;
                    }
                }
                if (resource == null) { traceRecursive(category, target); }
                else { deployResource(resource, target); }
                return result;
            }
        }
    }
}