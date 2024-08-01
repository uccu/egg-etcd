import { Etcd3, Lease, Watcher } from 'etcd3';
import { EggApplication } from 'egg';


export default class EtcdClient {

  private readonly app: EggApplication;
  public lease: Lease;
  private _client: Etcd3;
  private _watchers: { [key: string]: Watcher } = {};
  private _lease: { [key: string]: string } = {};

  constructor(app: EggApplication) {
    this.app = app;
    this.dial();
  }

  dial() {
    this._client = new Etcd3(this.app.config.etcd.options);
  }

  put(key: string, val: string, ignoreLease = false) {
    const builder = this._client.put(key).value(val);
    if (ignoreLease)builder.ignoreLease();
    return builder.exec();
  }

  delete(prefix: string) {
    const builder = this._client.delete().prefix(prefix);
    return builder.exec();
  }

  getByPrefix(prefix: string) {
    return this._client.getAll().prefix(prefix).strings();
  }

  async initLease() {
    this.lease = this._client.lease(this.app.config.etcd.leaseTTL);
    this.lease.on('lost', err => {
      console.error('We lost our lease as a result of this error:', err);
      console.log('Trying to re-grant it...');
      this.initLease();
    });

    for (const key in this._lease) {
      await this.lease.put(key).value(this._lease[key]).exec();
    }
  }

  setLease(key: string, val: string) {
    if (!this.lease) {
      this.initLease();
    }
    this._lease[key] = val;
    return this.lease.put(key).value(val).exec();
  }

  async watch(prefix: string) {
    this._watchers[prefix] = await this._client.watch().prefix(prefix).create();
    return this._watchers[prefix];
  }

  async unwatch(prefix: string) {
    await this._watchers[prefix].cancel();
    delete (this._watchers[prefix]);
  }

  close() {
    this._client.close();
  }
}
