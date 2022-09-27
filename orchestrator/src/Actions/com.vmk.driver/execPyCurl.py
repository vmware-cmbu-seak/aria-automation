import ssl
import json
import http.client

def handler(context, inputs):
    url = inputs['url']
    proto, path = url.split("://")
    proto = proto.lower()
    host = path.split("/")[0]
    path = path.replace(host, "", 1)
    method = inputs['method'].upper()
    headers = inputs['headers']

    if proto == "http": conn = http.client.HTTPConnection(host)
    elif proto == "https": conn = http.client.HTTPSConnection(host, context=ssl._create_unverified_context())
    else: raise Exception('Error [execPyCurl] : un-supported protocol')

    if method in ['POST', 'PUT', 'PATCH']:
        body = inputs['data']
        if not body: body = ''
        conn.request(method, path, body=body, headers=headers)
    else: conn.request(method, path, headers=headers)
    res = conn.getresponse()
    print('cURL {}: {} >> {}'.format(method, url, res.status))
    if res.status >= 400: raise Exception('Error [execPyCurl] : {}'.format(res.read().decode("utf-8")))
    return res.read().decode("utf-8")