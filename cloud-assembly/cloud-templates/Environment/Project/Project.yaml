formatVersion: 1
inputs:
  _serviceCategory_:
    type: string
    title: 서비스 카테고리
    default: Environment
    readOnly: true
  _serviceExpose_:
    type: string
    title: 서비스 노출
    default: ''
    readOnly: true
  _projectId_:
    type: string
    title: 기본 프로젝트 ID
  name_:
    type: string
    title: 프로젝트 이름
  description:
    type: string
    title: 프로젝트 설명
    default: ''
  administrator:
    type: string
    title: 관리자
  member:
    type: array
    title: 멤버
    items:
      type: string
    default: []
  viewer:
    type: array
    title: 감사자
    items:
      type: string
    default: []
  isVPZ_:
    type: boolean
    title: VPZ 프로젝트
    default: true
  zones_:
    type: array
    title: 클라우드 지역 선택
    items:
      type: string
    default: []
  catalog_:
    type: array
    title: 서비스 카탈로그
    items:
      type: string
    default: []
  sharedResources_:
    type: boolean
    title: 멤버간 자원공유
    default: true
resources:
  project:
    type: Custom.Project
    metadata:
      layoutPosition:
        - 0
        - 0
    properties:
      projectType: new
      name: ${input.name_}
      description: ${input.description}
      administrators: ${[input.administrator]}
      members: ${input.member}
      viewers: ${input.viewer}
      zones: ${input.zones_}
      catalogs: ${input.catalog_}
      customProperties: ${input.isVPZ_?{"vpzProjectName":input.name_}:null}
      sharedResources: ${input.sharedResources_}
