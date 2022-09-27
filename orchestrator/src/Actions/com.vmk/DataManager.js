return {
    find: function (path) {
        var result = new Properties();
        try {
            var category = Server.getConfigurationElementCategoryWithPath(path);
            var element = category.allConfigurationElements[0];
            for each(var attr in element.attributes) {
                result.put(attr.name, attr.value);
            }
        } catch (e) {
            throw "Error : DataManager.find(" + path + ") : " + e;
        }
        return result;
    },
    findAll: function (path) {
        var results = new Array();
        try {
            var categories = Server.getConfigurationElementCategoryWithPath(path);
            for each(var category in categories.subCategories) {
                var element = category.allConfigurationElements[0];
                var result = new Properties();
                for each(var attr in element.attributes) {
                    result.put(attr.name, attr.value);
                }
                results.push(result);
            }
        } catch (e) {
            throw "Error : DataManager.findAll(" + path + ") : " + e;
        }
        return results;
    },
    save: function (path, data) {
        var uuid;
        if (data.id !== undefined && data.id != null && data.id != "") { uuid = data.id; }
        else { uuid = System.nextUUID(); }
        var vro_path = path + "/" + uuid;
        var result = new Properties();
        LockingSystem.lockAndWait(vro_path, "DataManager");
        try {
            var element = Server.createConfigurationElement(vro_path, uuid);
            element.setAttributeWithKey("_vro_path", vro_path, "string");
            result.put("_vro_path", vro_path);
            element.setAttributeWithKey("_vro_id", uuid, "string");
            result.put("_vro_id", uuid);
            for (var key in data) {
                var val = data[key];
                element.setAttributeWithKey(key, val, System.getObjectType(val));
                result.put(key, val);
            }
        } catch (e) {
            LockingSystem.unlock(vro_path, "DataManager");
            throw "Error : DataManager.save(" + vro_path + ") : " + e;
        }
        LockingSystem.unlock(vro_path, "DataManager");
        return result;
    },
    update: function (path, data) {
        var result = new Properties();
        LockingSystem.lockAndWait(path, "DataManager");
        try {
            var category = Server.getConfigurationElementCategoryWithPath(path);
            var element = category.allConfigurationElements[0];
            for (var key in data) {
                if (key == "_vro_path" || key == "_vro_id") { continue; }
                var val = data[key];
                element.setAttributeWithKey(key, val, System.getObjectType(val));
            }
            for each(var attr in element.attributes) {
                result.put(attr.name, attr.value);
            }
        } catch (e) {
            LockingSystem.unlock(path, "DataManager");
            throw "Error : DataManager.update(" + path + ") : " + e;
        }
        LockingSystem.unlock(path, "DataManager");
        return result;
    },
    delete: function (path) {
        LockingSystem.lockAndWait(path, "DataManager");
        try {
            var category = Server.getConfigurationElementCategoryWithPath(path);
            var element = category.allConfigurationElements[0];
            Server.removeConfigurationElement(element);
            Server.removeConfigurationElementCategory(category);
        } catch (e) {
            LockingSystem.unlock(path, "DataManager");
            throw "Error : DataManager.remove(" + path + ") : " + e;
        }
        LockingSystem.unlock(path, "DataManager");
        return true;
    }
}
