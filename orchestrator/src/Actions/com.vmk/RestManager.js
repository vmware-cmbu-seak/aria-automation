return {
    _config: function () {
        if (baseUrl === undefined || baseUrl == null || baseUrl == "") {
            throw "Error [RestManager] : must be set host parameter";
        }
        if (headers === undefined || headers == null) { headers = new Properties(); }
        headers["Content-Type"] = "application/json";
        headers["Accept"] = "application/json";
        return {
            baseUrl: baseUrl,
            headers: headers
        }
    } (),
    _curl: System.getModule("com.vmk.tool").cURL(),
    get: function (url) { return JSON.parse(this._curl.get(this._config.baseUrl + url, this._config.headers)); },
    post: function (url, data) { return JSON.parse(this._curl.post(this._config.baseUrl + url, JSON.stringify(data), this._config.headers)); },
    put: function (url, data) { return JSON.parse(this._curl.put(this._config.baseUrl + url, JSON.stringify(data), this._config.headers)); },
    patch: function (url, data) { return JSON.parse(this._curl.patch(this._config.baseUrl + url, JSON.stringify(data), this._config.headers)); },
    delete: function (url) { return JSON.parse(this._curl.delete(this._config.baseUrl + url, this._config.headers)); }
}