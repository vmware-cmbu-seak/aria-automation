return {
    isString: function (input) {
        if (System.getObjectClassName(input) == "String") { return true; }
        return false;
    },
    isObject: function (input) {
        if (System.getObjectClassName(input) == "Object") { return true; }
        return false;
    },
    isUUID: function (input) {
        if (this.isString(input) && input.match("^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$") !== null) {
            return true;
        }
        return false;
    }
}