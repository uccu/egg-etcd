import { Etcd3, Lease, Watcher } from "etcd3";
import Watchers from "./watcher";
import { EggApplication } from "egg";
import { getGroup } from "../discovery/group";
import Server from "../discovery/server";

export default class Client {

    static client: Client

    public static setDefault(app: EggApplication) {
        Client.client = new Client(app)
    }

    public static get default() {
        return Client.client
    }

    setWatchPrefix(prefix: string) {
        this.ETCD_WATCH_PREFIX = prefix
    }
    setLeaseKey(key: string) {
        this.ETCD_LEASE_KEY = this.ETCD_WATCH_PREFIX + '/' + key
    }

    ETCD_WATCH_PREFIX: string;
    ETCD_LEASE_KEY: string;
    private readonly app: EggApplication
    public lease: Lease
    private _client: Etcd3
    private _watchers: { [key: string]: Watcher } = {}
    private _lease: { [key: string]: string } = {}

    constructor(app: EggApplication) {
        this.app = app
        this.dial()
    }

    dial() {
        const { hosts, dialTimeout } = this.app.config.etcd
        this._client = new Etcd3({ hosts, dialTimeout })
    }

    initLease() {
        this.lease = this._client.lease(this.app.config.etcd.leaseTTL)
    }

    async resetLease(force = false) {

        if (!this.lease) {
            return
        }

        if (!this.lease.revoked()) {
            if (!force) {
                return
            }
            await this.lease.revoke()
        }
        this.lease.release()
        this.initLease()

        for (const key in this._lease) {
            await this.lease.put(key).value(this._lease[key]).exec()
        }

        return this.get();
    }

    setLease() {
        if (!this.lease) {
            this.initLease()
        }
        const key = this.ETCD_LEASE_KEY
        const val = this.app.config.etcd.serverWeight + ''
        this._lease[key] = val
        return this.lease.put(key).value(val).exec()
    }

    async watch() {
        const prefix = this.ETCD_WATCH_PREFIX
        this._watchers[prefix] = await this._client.watch().prefix(prefix).create()

        const w = new Watchers(this.app, this);
        ['disconnected', 'connected', 'put', 'delete'].forEach(e => {
            // @ts-ignore
            this._watchers[prefix].on(e, w[e].bind(w))
        })
    }

    async get() {
        const prefix = this.ETCD_WATCH_PREFIX
        const data = await this._client.getAll().prefix(prefix).strings()
        for (const i in data) {
            const weight = parseInt(data[i])
            const [, , serverName, serverIp] = i.split('/')
            getGroup(this.app, serverName).add(new Server(serverIp, weight));
        }
    }

    async unwatch(prefix: string) {
        await this._watchers[prefix].cancel()
        delete (this._watchers[prefix])
    }

    close() {
        this._client.close()
    }
}