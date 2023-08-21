import { getGroup, getGroups } from './lib/discovery/group';
import EtcdControl from './lib/discovery/controller';
import { IOptions } from 'etcd3';

export { getGroup, getGroups, EtcdControl };

declare module 'egg' {

  interface EggApplication {
    watcher: any
    etcd: EtcdControl
  }

  interface EtcdConfig {
    options: IOptions
    leaseTTL: number
    projectName: string
    serverName: string
    nodeName: string
    serverIp: string
    serverWeight: number
    protocol: 'http' | 'https' | 'grpc' | 'no'
  }

  interface NewEggAppConfig {
    etcd: EtcdConfig
  }

}

