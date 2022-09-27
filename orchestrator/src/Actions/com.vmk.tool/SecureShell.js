if (host === undefined || host == null || host == "") { throw "Error [SecureShell] : must be set host parameter"; }
if (username === undefined || username == null || username == "") { throw "Error [SecureShell] : must be set username parameter"; }
if (password === undefined || password == null || password == "") { throw "Error [SecureShell] : must be set password parameter"; }
if (port === undefined || port == null || isNaN(port)) { port = 22; }

return {
    session: function () {
        this.host = host;
        this.port = port;
        var session = null;
        try {
            session = new SSHSession(host, username, port);
            session.connectWithPassword(password);
            session.setEncoding("UTF-8");
        } catch (e) {
            throw "Error [SecureShell] : could not connect to " + host + ":" + port + " : " + e;
        }
        return session;
    } (),
    disconnect: function () {
        try {
            this.session.disconnect();
        } catch (e) {
            throw "Error [SecureShell] : could not disconnect from " + this.host + ":" + this.port + " : " + e;
        }
    },
    exec: function (command) {
        try {
            return this.session.executeCommand(command, true);
        } catch (e) {
            throw "Error [SecureShell] : could not execute command on " + this.host + ":" + this.port + " : " + e;
        }
    },
    putFiles: function (source, target) {
        if (this.session.putFile(source, target) == 0) { return true; }
        throw "Error [SecureShell] : could not put files on " + this.host + ":" + this.port;
    }
}
