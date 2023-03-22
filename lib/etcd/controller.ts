import { Application } from "egg"
import { Etcd3 } from "etcd3"
import { getGroup } from "../discovery/group"
import Server from "../discovery/server"

export default class Controller {

    app: Application

    constructor(app: Application) {
        this.app = app
    }

    get(name: string): Server | null {
        return getGroup(this.app, name).next()
    }

    async update({ serverName, nodeName, serverIp, weight }) {
        const key = this.app.config.env + '/' + this.app.config.keys + '/' + serverName + '/' + nodeName + '/' + serverIp
        const { hosts, dialTimeout } = this.app.config.etcd
        const client = new Etcd3({ hosts, dialTimeout })
        await client.put(key).value(weight).ignoreLease().exec();
    }
}