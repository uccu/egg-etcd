import { Etcd3, Lease, Watcher } from "etcd3";
import { EggApplication } from "egg";


export default class EtcdClient {

    static client: EtcdClient

    public static init(app: EggApplication) {
        EtcdClient.client = new EtcdClient(app)
    }

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
        this._client = new Etcd3(this.app.config.etcd.options)
    }

    put(key: string, val: string) {
        return this._client.put(key).value(val).exec()
    }

    getByPrefix(prefix: string) {
        return this._client.getAll().prefix(prefix).strings()
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
    }

    setLease(key: string, val: string) {
        if (!this.lease) {
            this.initLease()
        }
        this._lease[key] = val
        return this.lease.put(key).value(val).exec()
    }

    async watch(prefix: string) {
        this._watchers[prefix] = await this._client.watch().prefix(prefix).create()
        return this._watchers[prefix]
    }

    async unwatch(prefix: string) {
        await this._watchers[prefix].cancel()
        delete (this._watchers[prefix])
    }

    close() {
        this._client.close()
    }
}