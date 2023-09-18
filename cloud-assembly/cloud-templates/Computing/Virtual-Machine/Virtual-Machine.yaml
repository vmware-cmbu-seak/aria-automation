formatVersion: 1
inputs:
  _serviceCategory_:
    type: string
    title: 서비스 카테고리
    default: Computing
    readOnly: true
  _serviceExpose_:
    type: string
    title: 서비스 노출
    readOnly: true
    default: resource.vm.address
  name_:
    type: string
    title: VM 이름
  zoneId_:
    type: string
    title: 클라우드 지역
  computeTag_:
    type: string
    title: 호스트 지역
  flavor_:
    type: string
    title: VM 성능
  networkTag_:
    type: string
    title: 네트워크
  ipAddress_:
    type: string
    title: IP 주소
    default: ''
  publicAddress_:
    type: boolean
    title: 외부 IP 할당
  fwRules_:
    type: array
    title: 방화벽 정책
    default: []
    items:
      type: object
      properties:
        name:
          type: string
          title: 이름
        direction:
          type: string
          title: 방향
          oneOf:
            - title: IN
              const: inbound
            - title: OUT
              const: outbound
        protocol:
          type: string
          title: 프로토콜
          enum:
            - ANY
            - ICMP
            - TCP
            - UDP
        ports:
          type: string
          title: 포트
        source:
          type: string
          title: 시작주소
        destination:
          type: string
          title: 도착지주소
        access:
          type: string
          title: 정책
          oneOf:
            - title: ALLOW
              const: Allow
            - title: DROP
              const: Drop
            - title: DENY
              const: Deny
  diskSize_:
    type: number
    title: 추가 디스크 (GB)
    default: 0
    minimum: 0
  mountPath_:
    type: string
    title: 디스크 경로
    default: /data
  image_:
    type: string
    title: OS 이미지
  packages_:
    type: array
    title: S/W 패키지
    default: []
    items:
      type: string
  bootScripts_:
    type: string
    title: 시작 스크립트
    default: ''
  username_:
    type: string
    title: 사용자 계정
  password_:
    type: string
    title: 사용자 암호
    encrypted: true
resources:
  fw:
    type: Cloud.SecurityGroup
    metadata:
      layoutPosition:
        - 0
        - 0
    properties:
      rules: ${input.fwRules_}
      securityGroupType: new
      count: ${length(input.fwRules_)>0?1:0}
  vm:
    type: Cloud.Machine
    metadata:
      layoutPosition:
        - 1
        - 0
    properties:
      name: ${input.name_}
      image: ${input.image_}
      flavor: ${input.flavor_}
      constraints:
        - tag: ${input.computeTag_}
      networks:
        - network: ${resource.net.id}
          assignment: static
          address: ${input.ipAddress_!=""?input.ipAddress_:null}
          assignPublicIpAddress: ${input.publicAddress_}
          securityGroups: ${resource.fw[*].id}
      attachedDisks: ${map_to_object(resource.disk[*].id, "source")}
      cloudConfig: |
        #cloud-config
        users:
          - name: ${input.username_}
            sudo: ALL=(ALL) NOPASSWD:ALL
            shell: /bin/bash
            groups: [adm, sudo, wheel, users]
            lock_passwd: false
        chpasswd:
          list: |
            ${input.username_}:${input.password_}
          expire: False
        ssh_pwauth: true
        ${input.diskSize_>0?"disk_setup:":""}
        ${input.diskSize_>0?"  /dev/sdb:":""}
        ${input.diskSize_>0?"    table_type: gpt":""}
        ${input.diskSize_>0?"    layout: True":""}
        ${input.diskSize_>0?"    overwrite: True":""}
        ${input.diskSize_>0?"  /dev/xvdf:":""}
        ${input.diskSize_>0?"    table_type: gpt":""}
        ${input.diskSize_>0?"    layout: True":""}
        ${input.diskSize_>0?"    overwrite: True":""}
        ${input.diskSize_>0?"fs_setup:":""}
        ${input.diskSize_>0?"  - device: /dev/sdb":""}
        ${input.diskSize_>0?"    filesystem: ext4":""}
        ${input.diskSize_>0?"    label: data_disk":""}
        ${input.diskSize_>0?"  - device: /dev/xvdf":""}
        ${input.diskSize_>0?"    filesystem: ext4":""}
        ${input.diskSize_>0?"    label: data_disk":""}
        ${input.diskSize_>0?"mounts:":""}
        ${input.diskSize_>0?"  - [/dev/disk/by-label/data_disk, " + input.mountPath_ + ", \"auto\", \"defaults\", \"0\", \"0\"]":""}
        package_update: true
        package_upgrade: true
        packages: ${input.packages_}
        runcmd:
          - mount -a
          - echo "${base64_encode(input.bootScripts_)}" | base64 -d | tee /opt/init.sh
          - chmod 755 /opt/init.sh
          - /opt/init.sh 2>&1 | tee -a /tmp/scripts.log
          - rm -rf /opt/init.sh
  net:
    type: Cloud.Network
    metadata:
      layoutPosition:
        - 2
        - 0
    properties:
      networkType: existing
      constraints:
        - tag: ${input.networkTag_}
  disk:
    type: Cloud.Volume
    metadata:
      layoutPosition:
        - 3
        - 0
    properties:
      capacityGb: ${input.diskSize_}
      count: ${input.diskSize_>0?1:0}
