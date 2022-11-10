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

# Implement Handler Here
def handler(context, inputs):
    # set common values
    vra = VraManager(context, inputs)
    
    # set default values
    if 'name' not in inputs or not inputs['name']: raise Exception('name property must be required') # Required
    if 'kubernetes' not in inputs or not inputs['kubernetes']: raise Exception('kubernetes property must be required') # Required
    if 'manifest' not in inputs or not inputs['manifest']: raise Exception('manifest property must be required') # Required
    if 'pipeConfig' not in inputs: inputs['pipeConfig'] = {
        'orders': [],
        'properties': {}
    } # Optional Dict Init
    if 'persistence' not in inputs: inputs['persistence'] = False # Optional Init
    
    name = inputs['name']
    kubernetes = inputs['kubernetes']
    manifest = inputs['manifest']
    pipeConfig = inputs['pipeConfig']
    if 'orders' not in pipeConfig: pipeConfig['orders'] = []
    if 'properties' not in pipeConfig: pipeConfig['properties'] = {}
    for metaName, property in pipeConfig['properties'].items():
        if 'ignoreFailure' not in property: property['ignoreFailure'] = True
        if isinstance(property['ignoreFailure'], str):
            ignoreFailure = property['ignoreFailure'].lower()
            if ignoreFailure not in ['true', 'false']: raise Exception('property[{}].ignoreFailure must be true or false'.format(metaName))
            else:
                if ignoreFailure == 'true': property['ignoreFailure'] = True
                else: property['ignoreFailure'] = False
        if 'timeout' not in property: property['timeout'] = 10
        if not isinstance(property['timeout'], int): raise Exception('property[{}].timeout must be number'.format(metaName))
    persistence = inputs['persistence']
    
    metaNames = []
    metaOrders = []
    for order in pipeConfig['orders']:
        if 'order' in order:
            for metaName in order['order']:
                if metaName in metaNames: raise Exception('meta[{}] must be at one order'.format(metaName))
            metaOrders.append(order['order'])
    
    taskOrders = [ [] for _ in metaOrders ]
    notOrderedTaskOrders = []
    taskApply = {}
    taskDelete = {}
    joinedTaskOrders = []
    for yml in manifest.strip().split('---'):
        if yml:
            innerMetadata = False
            for line in yml.strip().split('\n'):
                if innerMetadata:
                    if 'name:' in line:
                        metaName = line.split('name:')[1].strip()
                        break
                else:
                    if 'metadata:' in line and line.index('metadata:') == 0: innerMetadata = True
            else: raise Exception('could not find metadata.name in manifest')
            taskName = str(uuid.uuid4())
            for index in range(0, len(metaOrders)):
                if metaName in metaOrders[index]:
                    taskOrders[index].append(taskName)
                    break
            else: notOrderedTaskOrders.append(taskName)
            try: ignoreFailure = pipeConfig['properties'][metaName]['ignoreFailure']
            except: ignoreFailure = False
            try: timeout = pipeConfig['properties'][metaName]['timeout']
            except: timeout = 10
            taskApply[taskName] = {
                'type': 'K8S',
                'ignoreFailure': ignoreFailure,
                'preCondition': '${input.method}=="apply"',
                'input': {
                    'action': 'APPLY',
                    'timeout': timeout,
                    'filePath': '',
                    'scmConstants': {},
                    'yaml': yml
                },
                'endpoints': {'kubernetesServer': kubernetes},
                'tags': [],
                '_configured': True
            }
            taskDelete[taskName] = {
                'type': 'K8S',
                'ignoreFailure': True,
                'preCondition': '${input.method}=="delete"',
                'input': {
                    'action': 'DELETE',
                    'timeout': timeout,
                    'filePath': '',
                    'scmConstants': {},
                    'yaml': yml
                },
                'endpoints': {'kubernetesServer': kubernetes},
                'tags': [],
                '_configured': True
            }
    
    for order in taskOrders:
        if order:
            if len(order) > 24: raise Exception('order items could not be over 24 items')
            joinedTaskOrders.append(','.join(order))
    
    taskOrders = joinedTaskOrders
    if len(notOrderedTaskOrders) > 24: raise Exception('non-ordered items are over 24 items')
    taskOrders.append(','.join(notOrderedTaskOrders))
    taskOrdersApply = taskOrders
    taskOrdersDelete = list(taskOrders)
    taskOrdersDelete.reverse()
    
    # create resource
    endpoint = vra.get("/codestream/api/endpoints?$filter=(name eq '{}')".format(kubernetes))
    try: endpoint = endpoint['documents'][endpoint['links'][0]]
    except: raise Exception('could not find kubernetes : ' + kubernetes)
    
    resource = vra.post('/codestream/api/pipelines', {
        'project': endpoint['project'],
        'kind': 'PIPELINE',
        'name': '{}-{}'.format(name, str(uuid.uuid4())),
        'description': 'vra-custom-resource',
        'enabled': True,
        'concurrency': 1,
        'input': {'method': ''},
        'output': {},
        'starred': {},
        'stageOrder': ['Apply', 'Delete'],
        'stages': {
            'Apply': {
                'taskOrder': taskOrdersApply,
                'tasks': taskApply,
                'tags': []    
            },
            'Delete': {
                'taskOrder': taskOrdersDelete,
                'tasks': taskDelete,
                'tags': []
            }
        },
        'notifications': {'email': [], 'jira': [], 'webhook': []},
        'options': [],
        'workspace': {
            'image': '',
            'path': '',
            'type': 'DOCKER',
            'endpoint': '',
            'customProperties': {},
            'cache': [],
            'registry': '',
            'limits': {'cpu': 1.0, 'memory': 512},
            'autoCloneForTrigger': False,
            'environmentVariables': {}
        },
        '_inputMeta': {'method': {'description': '', 'mandatory': True}},
        '_outputMeta': {},
        '_warnings': [],
        'rollbacks': [],
        'tags': []
    })
    
    ## change state to enabled
    vra.patch('/codestream/api/pipelines/' + resource['id'], {'state': 'ENABLED'})
    
    ## execute apply method on pipeline
    try: executionLink = vra.post('/codestream/api/pipelines/{}/executions'.format(resource['id']), {'input': {'method': 'apply'}})['executionLink']
    except: 
        if not persistence:
            try: vra.delete('/codestream/api/pipelines/' + resource['id'])
            except: pass
        raise Exception('could not execute pipeline')
    
    for _ in range(0, 300):
        execution = vra.get(executionLink)
        if execution['status'] == 'COMPLETED': break
        elif execution['status'] == 'FAILED':
            vra.post('/codestream/api/pipelines/{}/executions'.format(resource['id']), {'input': {'method': 'delete'}})
            if not persistence:
                try: vra.delete('/codestream/api/pipelines/' + resource['id'])
                except: pass
            raise Exception('pipeline execution failed : ' + execution['statusMessage'])
        time.sleep(3)
    else:
        vra.post('/codestream/api/pipelines/{}/executions'.format(resource['id']), {'input': {'method': 'delete'}})
        if not persistence:
            try: vra.delete('/codestream/api/pipelines/' + resource['id'])
            except: pass
        raise Exception('pipeline execution might be stuck over 15 min')
    
    # publish resource
    outputs = inputs
    outputs.pop('VraManager')
    outputs['id'] = resource['id']
    return outputs
