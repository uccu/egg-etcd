import { getGroup, getGroups } from "./lib/discovery/group"
import EtcdControl from "./lib/discovery/controller"
import Server from "./lib/discovery/server"
import { IOptions } from "etcd3"

export { getGroup, getGroups, EtcdControl }


declare module 'egg' {

    interface EggApplication {
        options: {
            type: 'agent' | 'application'
        }
    }

    interface EtcdControlOn {
        on(e: 'nodeChanged', listener: (type: string, server: Server) => void): void
    }

    interface EtcdConfig {
        options: IOptions
        leaseTTL: number
        projectName: string
        serverName: string
        nodeName: string
        serverIp: string
        serverWeight: number
    }

    interface EggAppConfig {
        etcd: EtcdConfig
    }

    interface Agent {
        etcd: EtcdControl & EtcdControlOn
    }

    interface Application {
        etcd: EtcdControl & EtcdControlOn
    }

}


