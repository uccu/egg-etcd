import { Application, IBoot } from "egg";
import Server from "./lib/discovery/server";
import { getGroup } from "./lib/discovery/group";
import { Etcd3 } from "etcd3";

export default class FooBoot implements IBoot {

    private readonly app: Application;

    constructor(app: Application) {
        this.app = app;
    }

    configDidLoad() {
        const etcdConfig = this.app.config.etcd;
        if (process.env.SERVER_WEIGHT) etcdConfig.serverWeight = parseInt(process.env.SERVER_WEIGHT);
        if (process.env.SERVER_IP) etcdConfig.serverIp = process.env.SERVER_IP;
        if (process.env.NODE_NAME) etcdConfig.nodeName = process.env.NODE_NAME;
        if (process.env.SERVER_NAME) etcdConfig.serverName = process.env.SERVER_NAME;
    }

    async didReady() {

        this.app.messenger.on('discovery', ({ name, type, server }: { name: string, type: string, server: Server }) => {
            console.log(name, type, server)
            getGroup(this.app, name)[type](new Server(server.name, server.ip, server.weight))
        });

        this.app.etcd = {
            get: (name: string): Server | null => getGroup(this.app, name).next(),
            update: async ({ serverName, nodeName, serverIp, weight }) => {
                const key = this.app.config.env + '/' + this.app.config.keys + '/' + serverName + '/' + nodeName + '/' + serverIp
                const { hosts, dialTimeout } = this.app.config.etcd
                const client = new Etcd3({ hosts, dialTimeout })
                await client.put(key).value(weight).ignoreLease().exec();
            }
        }
    }

}