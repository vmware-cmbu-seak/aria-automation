method = method.toUpperCase();
if (headers === undefined || headers == null) { headers = {}; }
if (!("Content-Type" in headers)) {
    headers["Content-Type"] = "application/json";
}
if (!("Accept" in headers)) {
    headers["Accept"] = "application/json";
}
if (data !== undefined && data != null) { data = JSON.stringify(data); }
output = JSON.parse(System.getModule("com.vmk.driver").execPyCurl(method, url, data, headers));
