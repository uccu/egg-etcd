import { getGroup, getGroups } from "./lib/discovery/group"
import EtcdControl from "./lib/etcd/controller"

export { getGroup, getGroups }

declare module 'egg' {
  
  interface EggApplication {
    options: {
      type: 'agent' | 'application'
    }
  }

  interface Application {
    etcd: EtcdControl
  }
}


