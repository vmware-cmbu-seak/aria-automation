return {
    base64: {
        encode: function (v) {
            var k = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=";
            var t = "";
            var n, r, i, s, o, u, a;
            var f = 0;
            while (f < v.length) {
                n = v.charCodeAt(f++);
                r = v.charCodeAt(f++);
                i = v.charCodeAt(f++);
                s = n >> 2;
                o = ((n & 3) << 4) | (r >> 4);
                u = ((r & 15) << 2) | (i >> 6);
                a = i & 63;
                if (isNaN(r)) {
                    u = a = 64;
                } else if (isNaN(i)) {
                    a = 64;
                }
                t += k.charAt(s) + k.charAt(o) + k.charAt(u) + k.charAt(a);
            }
            return t;
        },
        decode: function (v) {
            var k = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=";
            var t = "";
            var n, r, i;
            var s, o, u, a;
            var f = 0;
            v = v.replace(/[^A-Za-z0-9+/=]/g,"");
            while (f < v.length) {
                s = k.indexOf(v.charAt(f++));
                o = k.indexOf(v.charAt(f++));
                u = k.indexOf(v.charAt(f++));
                a = k.indexOf(v.charAt(f++));
                n = (s << 2) | (o >> 4);
                r = ((o & 15) << 4) | (u >> 2);
                i = ((u & 3) << 6) | a;
                t += String.fromCharCode(n);
                if (u != 64) {
                    t += String.fromCharCode(r);
                }
                if (a != 64){
                    t += String.fromCharCode(i);
                }
            }
            return t;
        }
    },
    time: {
        getDateFromTimeStamp: function (v) {
            var n = v.match(/(\d\d\d\d)-(\d\d)-(\d\d)T(\d\d):(\d\d):(\d\d)/);
            return new Date(n[1], n[2], n[3], n[4], n[5], n[6]);
        }
    },
    ip: {
        getNumeric: function (v) {
            var n = 0;
            v.split(".").forEach(function (o) {
                n <<= 8;
                n += Number(o);
            });
            return n >>> 0;
        },
        getString: function (v) {
            return (v >>> 24) + "." + (v >> 16 & 255) + "." + (v >> 8 & 255) + "." + (v & 255);
        }
    },
    fill: {
        zero: function (number, width) {
            width -= number.toString().length;
            if (width > 0) { return new Array(width + (/\./.test(number)?2:1)).join("0") + number; }
            return number + ""; // always return a string
        }
    },
    yaml: {
        toJson: function (yaml) {
            var json = {};
            function recursive(index, indent, tokens, parent) {
                while (true) {
                    if (index >= tokens.length) { return index; }
                    var prev = index>0?tokens[index-1]:null;
                    var curr = tokens[index];
                    var next = index<tokens.length-1?tokens[index+1]:null;
                    if (curr.indent >= indent) {
                        if (curr.type == "o") {
                            if (next != null && next.indent > indent) {
                                var obj;
                                if (next.type == "kv") { obj = {}; }
                                else if (next.type == "o") { obj = {}; }
                                else if (next.type == "i") { obj = []; }
                                else if (next.type == "ikv") { obj = []; }
                                parent[curr.key] = obj;
                                index = recursive(index + 1, next.indent, tokens, obj);
                            } else {
                                parent[curr.key] = {};
                                index += 1;
                            }
                        } else if (curr.type == "ikv") {
                            var obj = {};
                            obj[curr.key] = curr.val;
                            parent.push(obj);
                            if (next != null && next.type == "kv") {
                                index = recursive(index + 1, indent, tokens, obj);
                            } else {
                                index += 1;
                            }
                        } else if (curr.type == "kv") {
                            parent[curr.key] = curr.val;
                            index += 1;
                            if (next != null && next.type == "ikv") { return index; }
                        } else if (curr.type == "i") {
                            parent.push(curr.val);
                            index += 1;
                        }
                    } else {
                        return index;
                    }
                    if (index >= tokens.length) { return index; }
                }

            }
            recursive(0, 0,
                function (yaml) {
                    var tokens = [];
                    var token = null;
                    var indentML = 1000000;
                    function typedVal(val) {
                        if (!isNaN(val)) {
                            return Number(val);
                        } else if (["true", "false"].indexOf(val) > -1) {
                            return val=="true"?true:false;
                        } else {
                            if (val[0] == '[' && val.match(/\]$/)) { return JSON.parse(val); }
                            else if (val[0] == '{' && val.match(/\}$/)) { return JSON.parse(val); }
                            else { return val }
                        }
                    }
                    function parse (line, token) {
                        var startToken = line.match(/\S+/);
                        if (startToken == null) return null;
                        if (startToken.indexOf("#") > -1) return null;
                        var indent = line.indexOf(startToken);
                        if (indent > indentML) {
                            token.val = token.val + "\n" + line.trim();
                            return null;
                        } else {
                            indentML = 1000000;
                            if (line.indexOf("---") > -1) { return null; }
                            var isItem = false;
                            if (startToken[0] == "-") {
                                indent += 2;
                                isItem = true;
                            }
                            var isObj = line.match(/^\s*-?\s*\w+\S*\s*\:\s*$/)!=null?true:false;
                            var isKV = line.match(/^\s*-?\s*\w+\S*\s*\:\s*.+\s*$/)!=null?true:false;
                            var isML = line.match(/^\s*-?\s*\w+\S*\s*\:\s*\|\s*$/)!=null?true:false;
                            if (!isItem && !isObj && !isKV && !isML) {
                                throw "Error: could not parse yaml line : " + line;
                            }
                            var token = {
                                indent: indent,
                                data: line,
                                type: ""
                            }
                            if (isItem) { token.type = "i"; }
                            if (isObj) {
                                token.type += "o";
                                token.key = line.split(":")[0].replace("- ", "").trim();
                            } else {
                                if (isKV) {
                                    token.type += "kv";
                                    token.key = line.split(":")[0].replace("- ", "").trim();
                                    if (isML) {
                                        token.val = "";
                                        indentML = indent;
                                    } else {
                                        token.val = line.substring(line.indexOf(":") + 1).trim();
                                        token.val = typedVal(token.val);
                                    }
                                }
                                else {
                                    token.val = line.trim().substring(2).trim();
                                    token.val = typedVal(token.val);
                                }
                            }
                            return token;
                        }
                    }
                    for each(var line in yaml.split("\n")) {
                        var parsed = parse(line, token);
                        if (parsed) {
                            token = parsed;
                            tokens.push(token);
                        }
                    }
                    return tokens;
                } (yaml), 
                json);
            return json;
        }
    }
}