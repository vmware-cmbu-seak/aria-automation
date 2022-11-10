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

# Implement Handler Here
def handler(context, inputs):
    # set common values
    vra = VraManager(context, inputs)
    
    # set default values
    if 'name' not in inputs or not inputs['name']: raise Exception('name property must be required') # Required
    if 'computes' not in inputs or not inputs['computes']: raise Exception('computes property must be required') # Required
    if 'networks' not in inputs or not inputs['networks']: raise Exception('networks property must be required') # Required
    if 'storage' not in inputs or not inputs['storage']: raise Exception('storage property must be required') # Required
    if 'placementPolicy' not in inputs or not inputs['placementPolicy']: inputs['placementPolicy'] = 'default' # Optional Init
    if 'loadBalancers' not in inputs: inputs['loadBalancers'] = [] # Optional Init
    if 'edgeCluster' not in inputs: inputs['edgeCluster'] = '' # Optional Init
    if 'storageType' not in inputs or not inputs['storageType']: inputs['storageType'] = 'thin' # Optional Init
    
    name = inputs['name']
    computes = inputs['computes']
    networks = inputs['networks']
    storage = inputs['storage']
    folder = inputs['folder']
    placementPolicy = inputs['placementPolicy'].upper()
    loadBalancers = inputs['loadBalancers']
    edgeCluster = inputs['edgeCluster']
    storageType = inputs['storageType']
    
    # retrieve resource
    ## retrieve computes references
    regions = vra.get('/iaas/api/regions')['content']
    fabricComputes = vra.get("/provisioning/uerp/resources/compute?expand&$filter=((type eq 'ZONE') or (type eq 'VM_HOST'))")['documents'].values()
    computeUerps = []
    computeLinks = []
    for compute in computes:
        for fabricCompute in fabricComputes:
            if compute == fabricCompute['name']:
                if len(computeUerps) == 0:
                    cloudAccountId = fabricCompute['endpointLink'].split('/endpoints/')[1]
                    regionId = fabricCompute['regionId']
                    for region in regions:
                        if region['cloudAccountId'] == cloudAccountId and region['externalRegionId'] == regionId:
                            provisioningRegionLink = '/provisioning/resources/provisioning-regions/' + region['id']
                            break
                    else: raise Exception('could not find region')
                else:
                    if cloudAccountId != fabricCompute['endpointLink'].split('/endpoints/')[1] and regionId != fabricCompute['regionId']: raise Exception('regions of computes are not same')
                computeUerps.append(fabricCompute)
                computeLinks.append(fabricCompute['documentSelfLink'])
                break
        else: raise Exception('could not find compute : ' + compute)
    computes = computeUerps
    
    ## retrieve networks references
    subnets = []
    subnetLinks = []
    for network in networks:
        try: network = vra.get('/provisioning/uerp' + network)
        except: raise Exception('could not find network : ' + network)
        try: subnets.append(vra.get('/provisioning/uerp' + network['subnetLink']))
        except: raise Exception('could not find subnet : ' + network['subnetLink'])
        subnetLinks.append(network['subnetLink'])
    
    ## retrieve loadbalancer references
    loadBalancerUerps = []
    loadBalancerLinks = []
    for loadBalancer in loadBalancers:
        loadBalancerLinks.append(loadBalancer)
        try: loadBalancerUerps.append(vra.get('/provisioning/uerp' + loadBalancer))
        except: raise Exception('could not find load balancer : ' + loadBalancer)
    loadBalancers = loadBalancerUerps
    
    ## retrieve edge cluster references
    edgeClusterRouterStateLink = None
    if edgeCluster:
        edgeClusterRouterStateLink = vra.get("/provisioning/uerp/resources/routers?$filter=(name eq '{}')".format(edgeCluster))
        if edgeClusterRouterStateLink['totalCount'] == 1: edgeClusterRouterStateLink = edgeClusterRouterStateLink['documentLinks'][0]
        else: raise Exception('could not find edge cluster : ' + edgeCluster)
    
    ## retrieve storage reference
    storageDescription = vra.get("/provisioning/uerp/resources/storage-descriptions?expand&$filter=((name eq '{}') and (endpointLink eq '/resources/endpoints/{}') and (regionId eq '{}'))".format(storage, cloudAccountId, regionId))
    if storageDescription['totalCount'] == 1: storageDescription = storageDescription['documents'][storageDescription['documentLinks'][0]]
    else: raise Exception('could not find storage : ' + storage)
    storageDescriptionLink = storageDescription['documentSelfLink']
    
    # update resource
    ## update zone profile
    zoneLink = '/provisioning/resources/placement-zones/' + inputs['id']
    zoneProf = vra.get('/provisioning/uerp' + zoneLink)
    zoneProf['name'] = name
    zoneProf['provisioningRegionLink'] = provisioningRegionLink
    zoneProf['computes'] = computes
    zoneProf['computeLinks'] = computeLinks
    zoneProf['placementPolicy'] = placementPolicy
    zoneProf['customProperties']['resourceGroupName'] = folder
    zoneProf = vra.put('/provisioning/uerp' + zoneLink, zoneProf)
    placementZoneLink = zoneProf['documentSelfLink']
    
    ## update network profile
    netProf = vra.get("/provisioning/uerp/provisioning/resources/network-profiles?expand&$filter=(placementZoneLink eq '{}')".format(placementZoneLink))
    if len(netProf['documentLinks']) < 1: raise Exception('could not find network profile')
    elif len(netProf['documentLinks']) > 1: raise Exception('multi network profiles are retrieved')
    netProf = netProf['documents'][netProf['documentLinks'][0]]
    netProf['provisioningRegionLink'] = provisioningRegionLink
    netProf['placementZoneLink'] = placementZoneLink
    netProf['subnets'] = subnets
    netProf['subnetLinks'] = subnetLinks
    netProf['loadBalancers'] = loadBalancers
    netProf['loadBalancerLinks'] = loadBalancerLinks
    netProf['customProperties']['edgeClusterRouterStateLink'] = edgeClusterRouterStateLink
    netProf = vra.put('/provisioning/uerp' + netProf['documentSelfLink'], netProf)
    
    ## update storage profile
    stgProf = vra.get("/provisioning/uerp/provisioning/mgmt/flat-storage-profile?$filter=(placementZoneLink eq '{}')".format(placementZoneLink))
    if len(stgProf) != 1: raise Exception('could not find storage profile')
    stgProf = stgProf[0]
    stgProf['provisioningRegionLink'] = provisioningRegionLink
    stgProf['placementZoneLink'] = placementZoneLink
    stgProf['storageDescription'] = storageDescription
    stgProf['storageDescriptionLink'] = storageDescriptionLink
    stgProf['customProperties']['provisioningType'] = storageType
    stgProf = vra.put('/provisioning/uerp' + stgProf['documentSelfLink'], stgProf)
        
    # publish resource
    outputs = inputs
    outputs.pop('VraManager')
    return outputs
