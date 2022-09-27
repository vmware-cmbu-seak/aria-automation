if (address === undefined || address === null || address === "") {
    throw "Error : address property must be required";
}
if (port === undefined || port === null || isNaN(port)) {
    port = 22;
}
if (username === undefined || username === null || username === "") {
    throw "Error : username property must be required";
}
if (password === undefined || password === null || password === "") {
    throw "Error : password property must be required";
}
if (commands === undefined || commands === null || commands === "") {
    throw "Error : commands property must be required";
}

var ssh = System.getModule("com.vmk.tool").SecureShell(address, username, password, port);
try {
    output = ssh.exec(commands);
} finally {
    ssh.disconnect();
}
