import { IKeyValue } from "etcd3"
import Client from "./client"
import { getGroup } from "../discovery/group"
import Server from "../discovery/server"
import { EggApplication } from "egg"

export default class Watcher {

    client: Client
    app: EggApplication


    constructor(app: EggApplication, client: Client) {
        this.app = app
        this.client = client
    }

    disconnected() {
        console.error('etcd disconnected...')
    }

    async connected() {
        await this.client.resetLease()
        console.log('successfully reconnected!')
    }

    put(res: IKeyValue) {
        const weight = parseInt(res.value.toString())
        const [, , serverName, serverIp] = res.key.toString().split('/')
        getGroup(this.app, serverName).add(new Server(serverIp, weight));
    }

    delete(res: IKeyValue) {
        const [, , serverName, serverIp] = res.key.toString().split('/')
        getGroup(this.app, serverName).remove(serverIp);
    }
}