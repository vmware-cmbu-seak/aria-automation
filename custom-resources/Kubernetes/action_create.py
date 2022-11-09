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
import re
import uuid
import time

# Implement Handler Here
def handler(context, inputs):
    # set common values
    vra = VraManager(context, inputs)
    
    # set default values
    if 'name' not in inputs or not inputs['name']: raise Exception('name property must be required') # Required
    name = inputs['name']
    if 'clusterType' not in inputs or not inputs['clusterType'] or inputs['clusterType'] not in ['tanzu', 'external']: raise Exception('clusterType property must be required') # Required
    if inputs['clusterType'] == 'tanzu':
        if 'cluster' not in inputs or not inputs['cluster']: raise Exception('cluster property must be required') # Required
        cluster = inputs['cluster']
        headers = {
            'Authorization': vra.headers['Authorization'],
            'Accept': 'application/json, text/plain, */*',
            'Accept-Encoding': 'gzip, deflate, br',
            'Accept-Language': 'ko,en-US;q=0.9,en;q=0.8,ko-KR;q=0.7'
        }
        kubeConfig = requests.get('https://{}{}/kube-config'.format(vra.hostname, cluster), headers=headers)
        kubeConfig.raise_for_status()
        kubeConfig = kubeConfig.text
        projectId = vra.get(cluster)['projectId']
        projectName = vra.get('/iaas/api/projects/{}'.format(projectId))['name']
    elif inputs['clusterType'] == 'external':
        if 'kubeConfig' not in inputs or not inputs['kubeConfig']: raise Exception('kubeConfig property must be required') # Required
        if 'project' not in inputs or not inputs['project']: raise Exception('project property must be required') # Required
        kubeConfig = inputs['kubeConfig']
        projectName = inputs['project']
        try: projectId = vra.get("/iaas/api/projects?$filter=(name eq '{}')".format(projectName))['content'][0]['id']
        except Exception as e: raise Exception('could not find project')
    
    try : server = re.search('server: ["\']?(?P<value>https?://\w[\w\.]+(:\d+)?)["\']?', kubeConfig)['value']
    except Exception as e: raise Exception('could not find server')
    try: ca = re.search('certificate-authority-data: ["\']?(?P<value>\w+\=*)["\']?', kubeConfig)['value']
    except Exception as e: raise Exception('could not find certificate-authority-data')
    try:
        cert = re.search('client-certificate-data: ["\']?(?P<value>\w+\=*)["\']?', kubeConfig)['value']
        key = re.search('client-key-data: ["\']?(?P<value>\w+\=*)["\']?', kubeConfig)['value']
    except Exception as e: raise Exception('could not find cert and key')
    if 'clusterManifest' not in inputs or not inputs['clusterManifest']: inputs['clusterManifest'] = ''
    clusterManifest = inputs['clusterManifest']
    
    # create resource
    if inputs['clusterType'] == 'external':
        cluster = '/cmx/api/resources/k8s/clusters/' + vra.post('/cmx/api/resources/k8s/clusters', {
            'project': projectId,
            'name': name,
            'address': server,
            'clusterType': 'EXTERNAL',
            'caCertificate': ca,
            'credentials': {
                'type': 'PublicKey',
                'publicKey': cert,
                'privateKey': key
            }
        })['id']
    
    req = {
        'project': projectName,
        'name': name,
        'type': 'k8s',
        'isRestricted': False,
        'properties': {
            'kubernetesURL': server,
            'authType': 'certificate',
            'certAuthorityData': ca,
            'certData': cert,
            'certKeyData': key,
            'fingerprint': vra.get('/codestream/api/endpoint-certificate?url={}'.format(server))['certificates'][0]['fingerprints']['SHA-256']
        }
    }
    vra.post('/codestream/api/endpoint-validation', req)
    resource = vra.post('/codestream/api/endpoints', req)
    
    if clusterManifest:
        pipeline = vra.post('/codestream/api/pipelines', {
            'project': projectName,
            'kind': 'PIPELINE',
            'name': '{}-{}'.format(name, str(uuid.uuid4())),
            'description': 'kubernetes-initial-manifest',
            'enabled': True,
            'concurrency': 1,
            'input': {'method': ''},
            'output': {},
            'starred': {},
            'stageOrder': ['Config'],
            'stages': {
                'Config': {
                    'taskOrder': ['Initial'],
                    'tasks': {
                        'Initial': {
                            'type': 'K8S',
                            'ignoreFailure': True,
                            'preCondition': '',
                            'input': {
                                'action': 'APPLY',
                                'timeout': 15,
                                'filePath': '',
                                'scmConstants': {},
                                'yaml': clusterManifest
                            },
                            'endpoints': {'kubernetesServer': name},
                            'tags': [],
                            '_configured': True
                        }
                    },
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
        
        vra.patch('/codestream/api/pipelines/' + pipeline['id'], {'state': 'ENABLED'})
        try: executionLink = vra.post('/codestream/api/pipelines/{}/executions'.format(pipeline['id']), {'input': {}})['executionLink']
        except: 
            try: vra.delete('/codestream/api/pipelines/' + pipeline['id'])
            except: pass
        for _ in range(0, 300):
            execution = vra.get(executionLink)
            if execution['status'] == 'COMPLETED': break
            elif execution['status'] == 'FAILED':
                try: vra.delete('/codestream/api/pipelines/' + pipeline['id'])
                except: pass
                raise Exception('cluster manifest execution failed : ' + execution['statusMessage'])
            time.sleep(3)
        else:
            try: vra.delete('/codestream/api/pipelines/' + pipeline['id'])
            except: pass
            raise Exception('cluster manifest execution might be stuck over 15 min')
        try: vra.delete('/codestream/api/pipelines/' + pipeline['id'])
        except: pass
    
    # publish resource
    outputs = inputs
    outputs.pop('VraManager')
    outputs['id'] = resource['id']
    outputs['cluster'] = cluster
    outputs['project'] = projectName
    outputs['kubeConfig'] = kubeConfig
    
    return outputs
