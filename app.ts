import { Application, IBoot } from "egg";
import Server from "./lib/discovery/server";
import { getGroup } from "./lib/discovery/group";

export default class FooBoot implements IBoot {

    private readonly app: Application;

    constructor(app: Application) {
        this.app = app;
    }

    configDidLoad() {
        const etcdConfig = this.app.config.etcd;
        if (process.env.SERVER_WEIGHT) etcdConfig.serverWeight = parseInt(process.env.SERVER_WEIGHT);
        if (process.env.SERVER_IP) etcdConfig.serverIp = process.env.SERVER_IP;
    }

    async didReady() {

        this.app.messenger.on('discovery', ({ name, type, server }: { name: string, type: string, server: Server }) => {
            console.log(name, type, server)
            getGroup(this.app, name)[type](server)
        });

        this.app.etcd = {
            get: (name: string): Server | null => getGroup(this.app, name).next()
        }
    }

}