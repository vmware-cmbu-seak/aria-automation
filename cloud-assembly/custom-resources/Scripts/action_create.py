# -*- coding: utf-8 -*-
'''
Created on 1983. 08. 09.
@author: Hye-Churn Jang, Staff Solution Architect, Multi-Cloud Management, Korea/SEAK/APJ/VMware [jangh@vmware.com]
'''

#===============================================================================
# Rest SDK Implementation                                                      #
#===============================================================================
import ssl
import json as JSON
import typing
import urllib.error
import urllib.request
from email.message import Message

class Response(typing.NamedTuple):
    text: str
    headers: Message
    status: int
    def json(self) -> typing.Any:
        try: output = JSON.loads(self.text)
        except JSON.JSONDecodeError: output = ''
        return output
    def raise_for_status(self):
        if self.status >= 400: raise Exception('response error with status code {}'.format(self.status))
        return self

class requests:
    @classmethod
    def __headers__(cls, headers):
        headers = headers or {}
        if 'Accept' not in headers: headers['Accept'] = 'application/json'
        if 'Content-Type' not in headers: headers['Content-Type'] = 'application/json'
        return headers
    @classmethod
    def __payload__(cls, data, json):
        if data: return data.encode('utf-8')
        elif json: return JSON.dumps(json).encode('utf-8')
        else: return ''.encode('utf-8')
    @classmethod
    def __encode__(cls, url): return url.replace(' ', '%20').replace('$', '%24').replace("'", '%27').replace('[', '%5B').replace(']', '%5D')
    @classmethod
    def __call__(cls, httprequest):
        try:
            with urllib.request.urlopen(httprequest, context=ssl._create_unverified_context()) as httpresponse: response = Response(text=httpresponse.read().decode(httpresponse.headers.get_content_charset('utf-8')), headers=httpresponse.headers, status=httpresponse.status)
        except urllib.error.HTTPError as e: response = Response(text=e.fp.read().decode('utf-8'), headers=e.headers, status=e.code)
        return response
    @classmethod
    def get(cls, url:str, headers:dict=None) -> Response: return cls.__call__(urllib.request.Request(cls.__encode__(url), method='GET', headers=cls.__headers__(headers)))
    @classmethod
    def post(cls, url:str, headers:dict=None, data:str=None, json:dict=None) -> Response: return cls.__call__(urllib.request.Request(cls.__encode__(url), method='POST', headers=cls.__headers__(headers), data=cls.__payload__(data, json)))
    @classmethod
    def put(cls, url:str, headers:dict=None, data:str=None, json:dict=None) -> Response: return cls.__call__(urllib.request.Request(cls.__encode__(url), method='PUT', headers=cls.__headers__(headers), data=cls.__payload__(data, json)))
    @classmethod
    def patch(cls, url:str, headers:dict=None, data:str=None, json:dict=None) -> Response: return cls.__call__(urllib.request.Request(cls.__encode__(url), method='PATCH', headers=cls.__headers__(headers), data=cls.__payload__(data, json)))
    @classmethod
    def delete(cls, url:str, headers:dict=None) -> Response: return cls.__call__(urllib.request.Request(cls.__encode__(url), method='DELETE', headers=cls.__headers__(headers)))

class VraManager:
    def __init__(self, context, inputs):
        self.hostname = context.getSecret(inputs['VraManager']['hostname'])
        self.headers = {}
        data = self.post('/csp/gateway/am/api/login?access_token', {'username': context.getSecret(inputs['VraManager']['username']), 'password': context.getSecret(inputs['VraManager']['password'])})
        data = self.post('/iaas/api/login', {'refreshToken': data['refresh_token']})
        self.headers['Authorization'] = 'Bearer ' + data['token']
    def toJson(self, response):
        try: response.raise_for_status()
        except Exception as e:
            try: data = JSON.dumps(response.json(), indent=2)
            except: data = response.text
            raise Exception('{} : {}'.format(str(e), data))
        return response.json()
    def get(self, url:str) -> dict: return self.toJson(requests.get('https://{}{}'.format(self.hostname, url), headers=self.headers))
    def post(self, url:str, data:dict=None) -> dict: return self.toJson(requests.post('https://{}{}'.format(self.hostname, url), headers=self.headers, json=data))
    def put(self, url:str, data:dict=None) -> dict: return self.toJson(requests.put('https://{}{}'.format(self.hostname, url), headers=self.headers, json=data))
    def patch(self, url:str, data:dict=None) -> dict: return self.toJson(requests.patch('https://{}{}'.format(self.hostname, url), headers=self.headers, json=data))
    def delete(self, url:str) -> dict: return self.toJson(requests.delete('https://{}{}'.format(self.hostname, url), headers=self.headers))



#===============================================================================
# ABX Code Implementations                                                     #
#===============================================================================
# Import Libraries Here
import uuid
import time
import base64

# Implement Handler Here
def handler(context, inputs):
    # set common values
    vra = VraManager(context, inputs)
    
    # set default values
    id = str(uuid.uuid4())
    instances = inputs['instances'] if 'instances' in inputs and inputs['instances'] else [] 
    if 'osType' not in inputs or not inputs['osType'] or inputs['osType'] not in ['linux', 'windows']: raise Exception('osType property must be one of linux or windows') # Required
    osType = inputs['osType']
    if 'username' not in inputs or not inputs['username']: raise Exception('username property must be required') # Required
    username = inputs['username']
    if 'password' not in inputs or not inputs['password']: raise Exception('password property must be required') # Required
    password = inputs['password'] = context.getSecret(inputs['password'])
    install = inputs['install'] if 'install' in inputs and inputs['install'] else ''
    configure = inputs['configure'] if 'configure' in inputs and inputs['configure'] else ''
    delimeter = '__VRA_EXEC_DELIMETER__'
    
    if install or configure:
        if osType == 'linux':
            scripts = '''# Scripts
exec 1>/tmp/{id}.stdout
exec 2>/tmp/{id}.stderr
output=/tmp/{id}.output
{install}
{configure}
'''.format(id=id, install=install, configure=configure)
            scripts = base64.b64encode(scripts.encode('utf-8')).decode('utf-8')
            runScripts = '''# Scripts
rm -rf /tmp/{id}.* 2>&1>/dev/null
echo "{scripts}" | base64 -d | tee /tmp/{id}.sh >/dev/null
chmod 755 /tmp/{id}.sh 2>&1>/dev/null
/tmp/{id}.sh
cat /tmp/{id}.stdout 2>/dev/null
echo "{delimeter}"
cat /tmp/{id}.stderr | sed "s/^[/\\.].*{id}.sh: //g" 2>/dev/null
echo "{delimeter}"
cat /tmp/{id}.output 2>/dev/null
'''.format(id=id, scripts=scripts, delimeter=delimeter)
        elif osType == 'windows':
            runScripts = install + '\n' + configure
        
        # create resource
        executions = {}
        executionIds = []
        for instance in instances:
            res = vra.post('/vco/api/workflows/8368da88-53ff-4285-af9b-c8fcea894901/executions', {
                'parameters': [{
                    'name': 'vmLink',
                    'type': 'string',
                    'value': {'string': {'value': instance}}
                },{
                    'name': 'username',
                    'type': 'string',
                    'value': {'string': {'value': username}}
                },{
                    'name': 'password',
                    'type': 'string',
                    'value': {'string': {'value': password}}
                },{
                    'name': 'scripts',
                    'type': 'string',
                    'value': {'string': {'value': runScripts}}
                }]
            })
            executions[res['id']] = instance
            executionIds.append(res['id'])
        executionCount = len(executionIds)
        
        completedIds = []
        executionOuts = {}
        for _ in range(0, 300):
            for executionId in executionIds:
                if executionId not in completedIds:
                    res = vra.get('/vco/api/workflows/8368da88-53ff-4285-af9b-c8fcea894901/executions/' + executionId + '/state')
                    state = res['value']
                    if state != 'running':
                        res = vra.get('/vco/api/workflows/8368da88-53ff-4285-af9b-c8fcea894901/executions/' + executionId)
                        if state == 'completed':
                            completedIds.append(executionId)
                            value = res['output-parameters'][0]['value']['string']['value'].split(delimeter)
                            log = value[0]
                            err = value[1]
                            out = value[2].strip()
                            executionOuts[executionId] = out
                            print('<create instance="{}" resource="scripts">\n<log>{}</log>\n<err>{}</err>\n<out>{}</out>\n</create>'.format(executions[executionId], log, err, out))
                        elif state == 'failed': raise Exception(res['content-exception'])
            if executionCount == len(completedIds): break
            time.sleep(2)
        else: raise Exception('scripts timeout')
        
        if executionCount == 1: consoleOutputs = executionOuts[executionIds[0]]
        elif executionCount > 1: consoleOutputs = [executionOuts[executionId] for executionId in executionIds]
        else: consoleOutputs = ''
    else: consoleOutputs = ''
    
    # publish resource
    outputs = inputs
    outputs.pop('VraManager')
    outputs['id'] = id
    outputs['outputs'] = consoleOutputs
    outputs['targets'] = instances
    return outputs
