var proto_lower = proto.toLowerCase();
url = proto_lower + "://" + host;
if ((proto_lower == "http" && port != 80) || (proto_lower == "https" && port != 443)) {
    url = url + ":" + port;
}
pbmUrl = url + "/pbm";
smsUrl = url + "/sms/sdk";

var conf = System.getModule("com.vmk").ConfManager();

try {
    conf.save("VMK/VcsaManager/" + host, {
        host: host,
        username: username,
        password: password
    });
} catch (e) {
    var data = conf.load("VMK/VcsaManager/" + host);
    data.username = username;
    data.password = password;
    data.save();
}

// + ""add a vCenter Instance Workflow:"