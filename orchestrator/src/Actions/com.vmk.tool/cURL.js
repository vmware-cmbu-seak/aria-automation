return {
    pycurl: System.getModule("com.vmk.driver").execPyCurl,
    get: function(url, headers) {
        if (headers === undefined || headers == null) { headers = {}; }
        return this.pycurl("GET", url, null, headers);
    },
    post: function(url, data, headers) {
        if (headers === undefined || headers == null) { headers = {}; }
        if (data === undefined || data == null) { data = {}; }
        return this.pycurl("POST", url, data, headers);
    },
    put: function(url, data, headers) {
        if (headers === undefined || headers == null) { headers = {}; }
        if (data === undefined || data == null) { data = {}; }
        return this.pycurl("PUT", url, data, headers);
    },
    patch: function(url, data, headers) {
        if (headers === undefined || headers == null) { headers = {}; }
        if (data === undefined || data == null) { data = {}; }
        return this.pycurl("PATCH", url, data, headers);
    },
    delete: function(url, headers) {
        if (headers === undefined || headers == null) { headers = {}; }
        return this.pycurl("DELETE", url, null, headers);
    }
}