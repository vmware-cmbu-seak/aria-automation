// Script 1
vraHost = "https://" + host;

// + "Add vRA Host" Workflow


// Script 2
for each(var host in VraHostManager.findHostsByType("vra-onprem")) {
    if (host.name == "VMK") {
        vraHostObj = host;
        break;
    }
}

// + "Update vRA Host" Workflow


// Script 3
var vra = System.getModule("com.vmk").VraManager();
var isExist = false;
for each(var constant in vra.get("/abx/api/resources/action-secrets").content) {
    if (constant.name == "VraManager") {
        constant.encrypted = true;
        constant.value = {
            "hostname": host,
            "username": username,
            "password": password
        }
        vra.put("/abx/api/resources/action-secrets/" + constant.id, constant);
        isExist = true;
    }
}
if (!isExist) {
    vra.post("/abx/api/resources/action-secrets", {
        "name": "VraManager",
        "encrypted": true,
        "value": {
            "hostname": host,
            "username": username,
            "password": password
        }
    });
}