// import * as CacheService from './app/service/CacheService'

import Server from "./lib/discovery/server"


interface EggRedisOptions {
  hosts: string[],
  leaseTTL: number,
  dialTimeout: number,
  serverName: string,
  serverWeight: number,
  serverIp: string,
}



declare module 'egg' {
  interface EggApplication {
    options: {
      type: 'agent' | 'application'
    }
  }
  interface Application {
    etcd: {
      get(name: string): Server | null
    }
  }

  interface EggAppConfig {
    etcd: EggRedisOptions
  }
}
