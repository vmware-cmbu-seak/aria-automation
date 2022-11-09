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
    if 'transportZone' not in inputs: inputs['transportZone'] = '' # Optional Init
    if 'externalNetwork' not in inputs: inputs['externalNetwork'] = '' # Optional Init
    if 'tier0Router' not in inputs: inputs['tier0Router'] = '' # Optional Init
    if 'edgeCluster' not in inputs: inputs['edgeCluster'] = '' # Optional Init
    if 'networkCIDR' not in inputs: inputs['networkCIDR'] = '' # Optional Init
    if 'subnetSize' not in inputs: inputs['subnetSize'] = '' # Optional Init
    if 'storageType' not in inputs or not inputs['storageType']: inputs['storageType'] = 'thin' # Optional Init
    
    name = inputs['name']
    computes = inputs['computes']
    networks = inputs['networks']
    storage = inputs['storage']
    folder = inputs['folder']
    placementPolicy = inputs['placementPolicy'].upper()
    loadBalancers = inputs['loadBalancers']
    transportZone = inputs['transportZone']
    externalNetwork = inputs['externalNetwork']
    tier0Router = inputs['tier0Router']
    edgeCluster = inputs['edgeCluster']
    networkCIDR = inputs['networkCIDR']
    subnetSize = inputs['subnetSize']
    onDemand = True if transportZone and externalNetwork and tier0Router and edgeCluster and networkCIDR and subnetSize else False
    storageType = inputs['storageType']
    
    # create resource
    ## make computes references
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
    
    ## make networks references
    subnets = []
    subnetLinks = []
    networkLink = None
    networkAllocationLink = None
    for network in networks:
        try: network = vra.get('/provisioning/uerp' + network)
        except: raise Exception('could not find network : ' + network)
        try: subnet = vra.get('/provisioning/uerp' + network['subnetLink'])
        except: raise Exception('could not find subnet : ' + network['subnetLink'])
        subnets.append(subnet)
        subnetLinks.append(network['subnetLink'])
        if not networkLink: networkLink = subnet['networkLink']
    
    ## make loadbalancer references
    loadBalancerUerps = []
    loadBalancerLinks = []
    for loadBalancer in loadBalancers:
        loadBalancerLinks.append(loadBalancer)
        try: loadBalancerUerps.append(vra.get('/provisioning/uerp' + loadBalancer))
        except: raise Exception('could not find load balancer : ' + loadBalancer)
    loadBalancers = loadBalancerUerps
    
    ## on demand network
    isolationType = 'NONE'
    isolationNetworkLink = None
    isolationNetworkCIDR = None
    isolationNetworkCIDRAllocationLink = None
    isolationExternalSubnetLink = None
    isolatedSubnetCIDRPrefix = None
    isolationNetworkCIDRAllocationLink = None
    tier0LogicalRouterStateLink = None
    edgeClusterRouterStateLink = None
    onDemandNetworkIPAssignmentType = None
    
    ## make tier0 router reference
    if tier0Router:
        tier0LogicalRouterStateLink = vra.get("/provisioning/uerp/resources/routers?$filter=(name eq '{}')".format(tier0Router))
        if tier0LogicalRouterStateLink['totalCount'] == 1: tier0LogicalRouterStateLink = tier0LogicalRouterStateLink['documentLinks'][0]
        else: raise Exception('could not find tier0 router : ' + tier0Router)

    ## make edge cluster reference
    if edgeCluster:
        edgeClusterRouterStateLink = vra.get("/provisioning/uerp/resources/routers?$filter=(name eq '{}')".format(edgeCluster))
        if edgeClusterRouterStateLink['totalCount'] == 1: edgeClusterRouterStateLink = edgeClusterRouterStateLink['documentLinks'][0]
        else: raise Exception('could not find edge cluster : ' + edgeCluster)
    
    if onDemand:
        isolationType = 'SUBNET'
        
        ## make transfort zone reference
        isolationNetworkLink = vra.get("/provisioning/uerp/resources/networks?$filter=(name eq '{}')".format(transportZone))
        if isolationNetworkLink['totalCount'] == 1: isolationNetworkLink = isolationNetworkLink['documentLinks'][0]
        else: raise Exception('could not find transfort zone : ' + transportZone)
        isolationNetworkCIDRAllocationLink = '/provisioning/resources/compute-network-cidr-allocations/' + isolationNetworkLink.split('/networks/')[1]
        isolationNetworkCIDR = networkCIDR
        isolatedSubnetCIDRPrefix = subnetSize
        onDemandNetworkIPAssignmentType = 'static'
        
        ## make external network reference
        if '/compute-networks/' in externalNetwork:
            try: network = vra.get('/provisioning/uerp' + externalNetwork)
            except: raise Exception('could not find network : ' + externalNetwork)
            isolationExternalSubnetLink = network['subnetLink']
        else:
            isolationExternalSubnetLink = vra.get("/provisioning/uerp/resources/sub-networks?$filter=((customProperties.__opaqueNetworkType eq 'nsx.LogicalSwitch') and (name eq '{}'))".format(externalNetwork))
            if isolationExternalSubnetLink['totalCount'] == 1: isolationExternalSubnetLink = isolationExternalSubnetLink['documentLinks'][0]
            else: raise Exception('could not find external network : ' + externalNetwork)
    
    ## make storage reference
    storageDescription = vra.get("/provisioning/uerp/resources/storage-descriptions?expand&$filter=((name eq '{}') and (endpointLink eq '/resources/endpoints/{}') and (regionId eq '{}'))".format(storage, cloudAccountId, regionId))
    if storageDescription['totalCount'] == 1: storageDescription = storageDescription['documents'][storageDescription['documentLinks'][0]]
    else: raise Exception('could not find storage : ' + storage)
    storageDescriptionLink = storageDescription['documentSelfLink']
    
    ## create zone
    resource = vra.post('/provisioning/uerp/provisioning/resources/placement-zones?expand', {
        'name': name,
        'type': 'vpc',
        'provisioningRegionLink': provisioningRegionLink,
        'computes': computes,
        'computeLinks': computeLinks,
        'placementPolicy': placementPolicy,
        'isStatic': True,
        'customProperties': {'resourceGroupName': folder}
    })
    placementZoneLink = resource['documentSelfLink']
    
    tagLinks = [vra.post('/provisioning/uerp/resources/tags', {
        'key': 'vpc',
        'value': 'demand'
    })['documentSelfLink']]
    
    ## create network profile
    vra.post('/provisioning/uerp/provisioning/resources/network-profiles', {
        'name': name + '-' + str(uuid.uuid4()),
        'provisioningRegionLink': provisioningRegionLink,
        'placementZoneLink': placementZoneLink,
        'subnets': subnets,
        'subnetLinks': subnetLinks,
        'loadBalancers': loadBalancers,
        'loadBalancerLinks': loadBalancerLinks,
        'securityGroups': [],
        'securityGroupLinks': [],
        'isolationType': isolationType,
        'isolationNetworkLink': isolationNetworkLink,
        'isolationNetworkCIDR': isolationNetworkCIDR,
        'isolatedSubnetCIDRPrefix': isolatedSubnetCIDRPrefix,
        'isolationNetworkCIDRAllocationLink': isolationNetworkCIDRAllocationLink,
        'isolationExternalSubnetLink': isolationExternalSubnetLink,
        'tagLinks': tagLinks,
        'customProperties': {
            'datacenterId': regionId,
            'resourcePoolId': None,
            'dataStoreId': None,
            'tier0LogicalRouterStateLink': tier0LogicalRouterStateLink,
            'edgeClusterRouterStateLink': edgeClusterRouterStateLink,
            'onDemandNetworkIPAssignmentType': onDemandNetworkIPAssignmentType
        }
    })
    
    ## create storage profile
    vra.post('/provisioning/uerp/provisioning/mgmt/flat-storage-profile', {
        'provisioningRegionLink': provisioningRegionLink,
        'placementZoneLink': placementZoneLink,
        'storageDescription': storageDescription,
        'storageDescriptionLink': storageDescriptionLink,
        'customProperties': {'provisioningType': storageType}
    })
    
    # publish resource
    outputs = inputs
    outputs.pop('VraManager')
    outputs['id'] = placementZoneLink.split('/placement-zones/')[1]
    return outputs
