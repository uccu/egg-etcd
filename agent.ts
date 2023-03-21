import { Agent, IBoot } from "egg";
import Client from "./lib/etcd/client";

export default class FooBoot implements IBoot {

    private readonly app: Agent
    private readonly etcd: Client

    constructor(app: Agent) {
        this.app = app
        this.etcd = new Client(app)
    }

    configDidLoad() {
        const etcdConfig = this.app.config.etcd;
        if (process.env.SERVER_WEIGHT) etcdConfig.serverWeight = parseInt(process.env.SERVER_WEIGHT);
        if (process.env.SERVER_IP) etcdConfig.serverIp = process.env.SERVER_IP;
    }

    async didLoad() {
        const etcdConfig = this.app.config.etcd;
        this.etcd.setWatchPrefix(this.app.config.env + '/' + this.app.config.keys)
        this.etcd.setLeaseKey(this.app.config.etcd.serverName + '/' + etcdConfig.serverIp)
    }


    async serverDidReady() {
        await this.etcd.setLease()
        await this.etcd.watch()
        await this.etcd.get()
    }

    async beforeClose() {
        if (this.etcd.lease) {
            await this.etcd.lease.revoke()
        }
        this.etcd.close()
    }
}