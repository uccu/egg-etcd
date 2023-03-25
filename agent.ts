import { Agent, IBoot } from "egg";
import EtcdClient from "./lib/etcd/client";
import DiscoveryClient from "./lib/discovery/client";
import Controller from "./lib/discovery/controller";
import { EtcdControl } from "index";

export default class FooBoot implements IBoot {

    app: Agent

    constructor(app: Agent) {
        this.app = app
        EtcdClient.init(app)
        DiscoveryClient.init(app)
    }

    configDidLoad() {
        DiscoveryClient.client.importEnv()
    }

    getc(): EtcdControl {
        return new Controller(this.app)
    }

    async didLoad() {
        this.app.etcd = new Controller(this.app)
    }

    async serverDidReady() {
        DiscoveryClient.client.leaseAndPutToDiscovery()
        DiscoveryClient.client.watchDiscoveryServer()
        DiscoveryClient.client.callDiscovery()
    }

    async beforeClose() {
        if (EtcdClient.client.lease) {
            await EtcdClient.client.lease.revoke()
        }
        EtcdClient.client.close()
    }
}