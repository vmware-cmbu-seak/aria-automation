return {
    _client: function () {
        for each(var host in VraHostManager.findHostsByType("vra-onprem")) {
            if (host.name == "VMK") { return host.createRestClient(); }
        }
        throw "Error [VraManager()] : could not find manager";
    } (),
    _encodeUrl: function (url) {
        // return url.replace(/\$/g, "%24").replace(/ /g, "%20").replace(/'/g, "%27").replace(/\[/g, "%5B").replace(/\]/g, "%5D");
        return encodeURI(url);
    },
    // GET
    getAsString: function (url, ignoreStatus) {
        var req = this._client.createRequest("GET", this._encodeUrl(url), null);
        var res = this._client.execute(req);
        System.log("VRA GET: " + url + " >> " + res.statusCode);
        if (res.statusCode >= 400) {
            if (ignoreStatus) {
                System.log("Error [VraManager.GET(" + url + ")] : " + res.contentAsString);
                return null;
            } else { throw "Error [VraManager.GET(" + url + ")] : " + res.contentAsString; }
        }
        return res.contentAsString;
    },
    get: function (url, ignoreStatus) {
        var content = this.getAsString(url, ignoreStatus);
        if (content != null && content != "") { return JSON.parse(content); } else { return null; }
    },
    getUerp: function (url, ignoreStatus) {
        return this.get("/provisioning/uerp" + url, ignoreStatus);
    },
    // POST
    postAsString: function (url, data, ignoreStatus) {
        var req = this._client.createRequest("POST", this._encodeUrl(url), data);
        var res = this._client.execute(req);
        System.log("VRA POST: " + url + " >> " + res.statusCode);
        if (res.statusCode >= 400) {
            if (ignoreStatus) {
                System.log("Error [VraManager.POST(" + url + ")] : " + res.contentAsString);
                return null;
            } else { throw "Error [VraManager.POST(" + url + ")] : " + res.contentAsString; }
        }
        return res.contentAsString;
    },
    post: function (url, data, ignoreStatus) {
        var content = this.postAsString(url, JSON.stringify(data), ignoreStatus);
        if (content != null && content != "") { return JSON.parse(content); } else { return null; }
    },
    postUerp: function (url, data, ignoreStatus) {
        return this.post("/provisioning/uerp" + url, data, ignoreStatus);
    },
    // PUT
    putAsString: function (url, data, ignoreStatus) {
        var req = this._client.createRequest("PUT", this._encodeUrl(url), data);
        var res = this._client.execute(req);
        System.log("VRA PUT: " + url + " >> " + res.statusCode);
        if (res.statusCode >= 400) {
            if (ignoreStatus) {
                System.log("Error [VraManager.PUT(" + url + ")] : " + res.contentAsString);
                return null;
            } else { throw "Error [VraManager.PUT(" + url + ")] : " + res.contentAsString; }
        }
        return res.contentAsString;
    },
    put: function (url, data, ignoreStatus) {
        var content = this.putAsString(url, JSON.stringify(data), ignoreStatus);
        if (content != null && content != "") { return JSON.parse(content); } else { return null; }
    },
    putUerp: function (url, data, ignoreStatus) {
        return this.put("/provisioning/uerp" + url, data, ignoreStatus);
    },
    // PATCH
    patchAsString: function (url, data, ignoreStatus) {
        var req = this._client.createRequest("PATCH", this._encodeUrl(url), data);
        var res = this._client.execute(req);
        System.log("VRA PATCH: " + url + " >> " + res.statusCode);
        if (res.statusCode >= 400) {
            if (ignoreStatus) {
                System.log("Error [VraManager.PATCH(" + url + ")] : " + res.contentAsString);
                return null;
            } else { throw "Error [VraManager.PATCH(" + url + ")] : " + res.contentAsString; }
        }
        return res.contentAsString;
    },
    patch: function (url, data, ignoreStatus) {
        var content = this.patchAsString(url, JSON.stringify(data), ignoreStatus);
        if (content != null && content != "") { return JSON.parse(content); } else { return null; }
    },
    patchUerp: function (url, data) {
        return this.patch("/provisioning/uerp" + url, data, ignoreStatus);
    },
    // DELETE
    deleteAsString: function (url, ignoreStatus) {
        var req = this._client.createRequest("DELETE", this._encodeUrl(url), null);
        var res = this._client.execute(req);
        System.log("VRA DELETE: " + url + " >> " + res.statusCode);
        if (res.statusCode >= 400) {
            if (ignoreStatus) {
                System.log("Error [VraManager.DELETE(" + url + ")] : " + res.contentAsString);
                return null;
            } else { throw "Error [VraManager.DELETE(" + url + ")] : " + res.contentAsString; }
        }
        return res.contentAsString;
    },
    delete: function (url, ignoreStatus) {
        var content = this.deleteAsString(url, ignoreStatus);
        if (content != null && content != "") { return JSON.parse(content); } else { return null; }
    },
    deleteUerp: function (url, ignoreStatus) {
        return this.delete("/provisioning/uerp" + url, ignoreStatus);
    },
    //////////////////////// object functions ////////////////////////
    // Projects
// {
//     name: ProjectName,
//     description: Description,
//     administrators: [Administrators],
//     members: [Members],
//     viewers: [Viewers],
//     zoneAssignmentConfigurations: [ZoneAssignmentConfigs],
//     machineNamingTemplate
// }
    projects: function (input) {
        function updateProject () {
            return this._vra.patch("/iaas/api/projects/" + this.id, {
                name: this.name,
                description: this.description,
                administrators: this.administrators,
                members: this.members,
                viewers: this.viewers,
                zoneAssignmentConfigurations: this.zoneAssignmentConfigurations,
                machineNamingTemplate: this.machineNamingTemplate
            });
        }
        function deleteProject () { return this._vra.delete("/iaas/api/projects/" + this.id); }
        function addMethodToProject (vra, project) {
            project._vra = vra;
            project.update = updateProject;
            project.delete = deleteProject;
            return project;
        }
        if (input == null) { // Get All Projects
            var projects = [];
            var sum = 0;
            for (var skip = 0;;skip += 200) {
                var data = this.get("/iaas/api/projects?$top=200&$skip=" + skip);
                projects = projects.concat(data.content);
                sum += data.numberOfElements;
                if (data.totalElements <= sum) { break; }
            }
            for each(var project in projects) { addMethodToProject(this, project); }
            return projects;
        }
        var checker = System.getModule("com.vmk.tool").Checker();
        if (checker.isObject(input)) { // Create Project
            return this.post("/iaas/api/projects", input);
        }
        if (checker.isUUID(input)) { // Get by ID
            return addMethodToProject(this, this.get("/iaas/api/projects/" + input));
        } else { // Get by Name
            for each(var content in this.get("/iaas/api/projects?$filter=(name eq '" + input + "')").content) {
                return addMethodToProject(this, content);
            }
            return null;
        }
    },
    // Deployments
    deployments: function (input) {
        // Operation
        function deleteResource () { return this._vra.delete("/deployment/api/deployments/" + this._dep_id + "/resources/" + this.id); }
        function updateDeployment (inputs) {
            this._vra.post("/deployment/api/deployments/" + this.id + "/requests", {
                actionId: "Deployment.Update",
                inputs: inputs
            });
            return this;
        }
        function deleteDeployment () { return this._vra.delete("/deployment/api/deployments/" + this.id); }
        function deleteDeploymentAfterSec (sec) {
            var task = System.getModule("com.vmk").TaskManager("9eb9eeec-89ab-407d-a992-d1ad347ba151");
            task.sched({deploymentId: this.id}, sec);
        }
        function addMethodToResource (vra, deployment, resource) {
            resource._vra = vra;
            resource._dep_id = deployment.id;
            resource.delete = deleteResource;
            return resource;
        }
        function getResources (id) {
            if (id == null) {
                var resources = this._vra.get("/deployment/api/deployments/" + this.id + "/resources").content;
                for each(var resource in resources) { addMethodToResource(this._vra, deployment, resource); }
                return resources;
            }
            var resource = this._vra.get("/deployment/api/deployments/" + this.id + "/resources/" + id);
            return addMethodToResource(this._vra, deployment, resource);
        }
        function addMethodToDeployment (vra, deployment) {
            deployment._vra = vra;
            deployment.update = updateDeployment;
            deployment.delete = deleteDeployment;
            deployment.deleteAfterSec = deleteDeploymentAfterSec;
            deployment.resources = getResources;
            return deployment;
        }
        if (input == null) { // Get All Deployments
            var deployments = [];
            for (var skip = 0;;skip += 200) {
                var data = this.get("/deployment/api/deployments?$top=200&$skip=" + skip);
                deployments = deployments.concat(data.content);
                if (data.last) { break; }
            }
            for each(var deployment in deployments) { addMethodToDeployment(this, deployment); }
            return deployments;
        }
        if (System.getModule("com.vmk.tool").Checker().isUUID(input)) { // Get by ID
            return addMethodToDeployment(this, this.get("/deployment/api/deployments/" + input));
        } else { // Get by Name
            for each(var content in this.get("/deployment/api/deployments?$filter=(name eq '" + input + "')").content) {
                return addMethodToDeployment(this, content);
            }
            return null;
        }
    },
    // Catalogs
    catalogs: function (input) {
        function getCatalogForm () {
            var inputs = {};
            for (var key in this.schema.properties) {
                var desc = this.schema.properties[key];
                if (desc.default !== undefined) { inputs[key] = desc.default; }
                else { inputs[key] = null; }
            }
            return {
                deploymentName: null,
                projectId: null,
                inputs: inputs
            }
        }
        function requestCatalog (form) {
            return this._vra.post("/catalog/api/items/" + this.id + '/request', form)[0];
        }
        function addMethodToCatalog (vra, catalog) {
            catalog._vra = vra;
            catalog.getForm = getCatalogForm;
            catalog.request = requestCatalog;
            return catalog;
        }
        if (input == null) { // Get All Catalogs
            var catalogs = [];
            for (var skip = 0;;skip += 200) {
                var data = this.get("/catalog/api/items?$top=200&$skip=" + skip);
                catalogs = catalogs.concat(data.content);
                if (data.last) { break; }
            }
            for each(var catalog in catalogs) { addMethodToCatalog(this, catalog); }
            return catalogs;
        }
        if (System.getModule("com.vmk.tool").Checker().isUUID(input)) { // Get by ID
            return addMethodToCatalog(this, this.get("/catalog/api/items/" + input));
        } else { // Get by Name
            for each(var content in this.get("/catalog/api/items?search=" + input).content) {
                if (content.name == input) {
                    return addMethodToCatalog(this, content);
                }
            }
            return null;
        }
    },
    // Blueprint
    blueprints: function (input) {
        function requestBlueprint (form) {
            form.blueprintId = this.id;
            return this._vra.post("/blueprint/api/blueprint-requests", form);
        }
        function addMethodToBlueprint (vra, blueprint) {
            blueprint._vra = vra;
            blueprint.request = requestBlueprint;
            return blueprint;
        }
        if (input == null) { // Get All Blueprints
            var blueprints = [];
            for (var skip = 0;;skip += 200) {
                var data = this.get("/blueprint/api/blueprints?$top=200&$skip=" + skip);
                blueprints = blueprints.concat(data.content);
                if (data.last) { break; }
            }
            for each(var blueprint in blueprints) { addMethodToBlueprint(this, blueprint); }
            return blueprints;
        }
        if (System.getModule("com.vmk.tool").Checker().isUUID(input)) { // Get by ID
            return addMethodToBlueprint(this, this.get("/blueprint/api/blueprints/" + input));
        } else { // Get by Name
            for each(var content in this.get("/blueprint/api/blueprints?search=" + input).content) {
                if (content.name == input) {
                    return addMethodToBlueprint(this, content);
                }
            }
            return null;
        }
    },
    // Machines
    machines: function (input) {
        function execScripts (username, password, scripts) {
            var endpoint = this._vra.getUerp(this._vra.getUerp("/resources/compute/" + this.id).endpointLink);
            if (endpoint.endpointType == "vsphere") {
                return System.getModule("com.vmk").VcsaManager().vm(this.name).execScripts(username, password, scripts);
            } else {
                var ssh = System.getModule("com.vmk.tool").SecureShell(this.address, username, password);
                var output;
                try { output = ssh.exec(scripts); } finally { ssh.disconnect(); }
                return output;
            }
        }
        function deployFiles (username, password, source, target) {
            var endpoint = this._vra.getUerp(this._vra.getUerp("/resources/compute/" + this.id).endpointLink);
            if (endpoint.endpointType == "vsphere") {
                return System.getModule("com.vmk").VcsaManager().vm(this.name).deployFiles(username, password, source, target);
            } else {
                throw "Error [VraManager.machine(" + this.name + ").deployFiles()] : could not deploy files on non-vsphere vm";
            }
        }
        function addMethod (vra, content) {
            content._vra = vra;
            content.execScripts = execScripts;
            content.deployFiles = deployFiles;
            return content;
        }
        if (input == null) { // Get All Machines
            var machines = [];
            var sum = 0;
            for (var skip = 0;;skip += 200) {
                var data = this.get("/iaas/api/machines?$top=200&$skip=" + skip);
                machines = machines.concat(data.content);
                sum += data.numberOfElements;
                if (data.totalElements <= sum) { break; }
            }
            return machines;
        }
        if (input.indexOf("/resources/compute/") > -1) { input = input.replace("/resources/compute/", ""); }
        if (System.getModule("com.vmk.tool").Checker().isUUID(input)) { // Get by ID
            return addMethod(this, this.get("/iaas/api/machines/" + input));
        } else { // Get by Name
            for each(var content in this.get("/iaas/api/machines?$filter=(name eq '" + input + "')").content) {
                if (content.name == input) {
                    return addMethod(this, content);
                }
            }
            return null;
        }
    }
}