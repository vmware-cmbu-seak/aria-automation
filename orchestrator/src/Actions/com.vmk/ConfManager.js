function obj_save_function () {
    LockingSystem.lockAndWait(this._path, "ConfManager");
    try {
        var category = Server.getConfigurationElementCategoryWithPath(this._path);
        var element = category.allConfigurationElements[0];
        for (var key in this) {
            var val = this[key];
            if (typeof(val) != "function") {
                if (key.toLowerCase().indexOf("password") > -1) {
                    element.setAttributeWithKey(key, val, "SecureString");    
                } else {
                    element.setAttributeWithKey(key, val, System.getObjectType(val));
                }
            }
        }
    } catch (e) {
        LockingSystem.unlock(this._path, "ConfManager");
        throw "Error [ConfManager.save(" + this._path + ")] : " + e;
    }
    LockingSystem.unlock(this._path, "ConfManager");
    return this;
}

function obj_remove_function () {
    LockingSystem.lockAndWait(this._path, "ConfManager");
    try {
        var category = Server.getConfigurationElementCategoryWithPath(this._path);
        var element = category.allConfigurationElements[0];
        Server.removeConfigurationElement(element);
        Server.removeConfigurationElementCategory(category);
        delete this._path;
    } catch (e) {
        LockingSystem.unlock(this._path, "ConfManager");
        throw "Error [ConfManager.remove(" + this._path + ")] : " + e;
    }
    LockingSystem.unlock(this._path, "ConfManager");
    return this;
}

return {
    load: function (path) {
        var result = new Properties();
        try {
            var category = Server.getConfigurationElementCategoryWithPath(path);
            if (category == null) { throw "could not find path"; }
            var element = category.allConfigurationElements[0];
            if (element == null) { throw "could not find data"; }
            for each(var attr in element.attributes) { result.put(attr.name, attr.value); }
            result.put("save", obj_save_function);
            result.put("remove", obj_remove_function);
        } catch (e) {
            throw "Error [ConfManager.load(" + path + ")] : " + e;
        }
        return result;
    },
    save: function (path, data) {
        var result = new Properties();
        LockingSystem.lockAndWait(path, "ConfManager");
        try {
            var element = Server.createConfigurationElement(path, "data");
            for (var key in data) {
                var val = data[key];
                if (typeof(val) != "function") {
                    if (key.toLowerCase().indexOf("password") > -1) {
                        element.setAttributeWithKey(key, val, "SecureString");    
                    } else {
                        element.setAttributeWithKey(key, val, System.getObjectType(val));
                    }
                }
                result.put(key, val);
            }
            element.setAttributeWithKey("_path", path, "string");
            result.put("_path", path);
            result.put("save", obj_save_function);
            result.put("remove", obj_remove_function);
        } catch (e) {
            LockingSystem.unlock(path, "ConfManager");
            throw "Error [ConfManager.save(" + path + ")] : " + e;
        }
        LockingSystem.unlock(path, "ConfManager");
        return result;
    },
    delete: function (path) {
        LockingSystem.lockAndWait(path, "ConfManager");
        try {
            var category = Server.getConfigurationElementCategoryWithPath(path);
            var element = category.allConfigurationElements[0];
            Server.removeConfigurationElement(element);
            Server.removeConfigurationElementCategory(category);
        } catch (e) {
            LockingSystem.unlock(path, "ConfManager");
            throw "Error [ConfManager.remove(" + path + ")] : " + e;
        }
        LockingSystem.unlock(path, "ConfManager");
        return true;
    }
}
