var vra = System.getModule("com.vmk").VraManager();
var projectId = project.id;
var secrets = {};
for each(var secret in vra.get("/abx/api/resources/action-secrets").content) {
    secrets[secret["name"]] = "secret:" + secret["id"];
}

function getManifest(folder) {
    for each(var file in folder.resourceElements) {
        if (file.name == "manifest.json") {
            return JSON.parse(file.getContentAsMimeAttachment().content);
        }
    }
    throw "Error : could not find manifest.json : " + folderName;
}

function registerAction(name, inputs, constants, source) {
    System.log("Register Action : " + name);
    for each(var constant in constants) {
        inputs[secrets[constant]] = ""
    }
    for each (var action in vra.get("/abx/api/resources/actions?$filter=(name eq '" + name + "')").content) {
        if (action.name == name && action.projectId == projectId) {
            action.inputs = inputs;
            action.source = source;
            vra.put("/abx/api/resources/actions/" + action.id, action);
            System.log(" --> Update Action : " + name);
            return action.id;
        }
    }
    var action = vra.post("/abx/api/resources/actions", {
        "name": name,
        "projectId": projectId,
        "inputs": inputs,
        "source": source,
        "memoryInMB": 512,
        "timeoutSeconds": 900,
        "scalable": true,
        "shared": true,
        "actionType": "SCRIPT",
        "entrypoint": "handler",
        "scriptSource": 0,
        "runtime": "python",
        "configuration": {},
        "provider": "on-prem",
        "metadata": {
            "actionIsRetriable": false
        }
    });
    System.log(" --> Create Action : " + name);
    return action.id
}

function registerActionByFolder(manifest, folder) {
    var result = {};
    for each(var file in folder.resourceElements) {
        switch (file.name) {
            case "action.create.py":
                result.create = registerAction("Custom." + manifest.name + ".create()", manifest.inputs.create, manifest.constants.create, file.getContentAsMimeAttachment().content);
                break;
            case "action.read.py":
                result.read = registerAction("Custom." + manifest.name + ".read()", manifest.inputs.read, manifest.constants.read, file.getContentAsMimeAttachment().content);
                break;
            case "action.update.py":
                result.update = registerAction("Custom." + manifest.name + ".update()", manifest.inputs.update, manifest.constants.update, file.getContentAsMimeAttachment().content);
                break;
            case "action.delete.py":
                result.delete = registerAction("Custom." + manifest.name + ".delete()", manifest.inputs.delete, manifest.constants.delete, file.getContentAsMimeAttachment().content);
                break;
        }
    }
    return result;
}

function registerResource(manifest, actions) {
    for each(var resource in vra.get("/form-service/api/custom/resource-types?$filter=(displayName eq '" + manifest.name + "')").content) {
        if (resource.displayName == manifest.name) {
            System.log("Update Resource : " + manifest.name);
            var mainActions = resource.mainActions;
            mainActions.create = {
                "id": actions.create,
                "name": "Custom." + manifest.name + ".create()",
                "projectId": projectId,
                "type": "abx.action"
            }
            mainActions.read = {
                "id": actions.read,
                "name": "Custom." + manifest.name + ".read()",
                "projectId": projectId,
                "type": "abx.action"
            }
            if (actions.update !== undefined) {
                mainActions.update = {
                    "id": actions.update,
                    "name": "Custom." + manifest.name + ".update()",
                    "projectId": projectId,
                    "type": "abx.action"
                }
            }
            mainActions.delete = {
                "id": actions.delete,
                "name": "Custom." + manifest.name + ".delete()",
                "projectId": projectId,
                "type": "abx.action"
            }
            resource.properties.properties = manifest.properties;
            return vra.post("/form-service/api/custom/resource-types", resource);
        }
    }
    System.log("Create Resource : " + manifest.name);
    var resource = {
        "displayName": manifest.name,
        "description": "",
        "resourceType": "Custom." + manifest.name,
        "externalType": null,
        "status": "RELEASED",
        "schemaType": "ABX_USER_DEFINED",
        "properties": {
            "properties": manifest.properties
        },
        "additionalActions": [],
        "mainActions": {
            "create": {
                "id": actions.create,
                "name": "Custom." + manifest.name + ".create()",
                "projectId": projectId,
                "type": "abx.action"
            },
            "read": {
                "id": actions.read,
                "name": "Custom." + manifest.name + ".read()",
                "projectId": projectId,
                "type": "abx.action"
            },
            "delete": {
                "id": actions.delete,
                "name": "Custom." + manifest.name + ".delete()",
                "projectId": projectId,
                "type": "abx.action"
            }
        }
    }
    if (actions.update !== undefined) {
        resource.mainActions.update = {
            "id": actions.update,
            "name": "Custom." + manifest.name + ".update()",
            "projectId": projectId,
            "type": "abx.action"
        }
    }
    return vra.post("/form-service/api/custom/resource-types", resource);
}

for each(var folder in Server.getResourceElementCategoryWithPath(basePath).subCategories) {
    var manifest = getManifest(folder);
    var actions = registerActionByFolder(manifest, folder);
    var resource = registerResource(manifest, actions);
}