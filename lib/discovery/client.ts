import { EggApplication } from 'egg';
import { hostname } from 'os';
import EtcdClient from '../etcd/client';
import { getGroup, getGroupOrCreate } from './group';
import { newServer } from './server';
import { IKeyValue } from 'etcd3';

export default class DiscoveryClient {

  static client: DiscoveryClient;

  static init(app: EggApplication) {
    DiscoveryClient.client = new DiscoveryClient(app);
  }

  app: EggApplication;

  constructor(app: EggApplication) {
    this.app = app;
  }

  get leaseVal() {
    return this.app.config.etcd.nodeName + '|' + this.app.config.etcd.serverWeight + '|' + this.app.config.etcd.protocol;
  }

  get leaseKey() {
    return this.watchPrefix + this.app.config.etcd.serverName + '/' + this.app.config.etcd.serverIp;
  }

  get watchPrefix() {
    return this.app.config.etcd.projectName + '/' + this.app.config.env + '/discovery/';
  }

  importEnv() {
    const etcdConfig = this.app.config.etcd || {};
    if (process.env.SERVER_WEIGHT) etcdConfig.serverWeight = parseInt(process.env.SERVER_WEIGHT);
    if (process.env.PROJECT_NAME) etcdConfig.projectName = process.env.PROJECT_NAME;
    if (process.env.SERVER_IP) etcdConfig.serverIp = process.env.SERVER_IP;
    if (process.env.NODE_NAME) etcdConfig.nodeName = process.env.NODE_NAME;
    if (process.env.SERVER_NAME) etcdConfig.serverName = process.env.SERVER_NAME;

    etcdConfig.nodeName ||= hostname();
    etcdConfig.protocol ||= 'no';

  }


  async watchDiscoveryServer() {
    const watcher = await EtcdClient.client.watch(this.watchPrefix);
    watcher.on('connected', async () => {
      await EtcdClient.client.resetLease();
      return this.callDiscovery();
    });
    watcher.on('put', (res: IKeyValue) => {
      this.callDiscoveryOne(res.key.toString(), res.value.toString());
    });
    watcher.on('delete', (res: IKeyValue) => {
      const [ , , , serverName, serverIp ] = res.key.toString().split('/');
      getGroup(serverName)?.remove(serverIp);
    });
  }

  leaseAndPutToDiscovery() {
    return EtcdClient.client.setLease(this.leaseKey, this.leaseVal);
  }

  async callDiscovery(send = true) {
    const data = await EtcdClient.client.getByPrefix(this.watchPrefix);
    for (const i in data) {
      this.callDiscoveryOne(i, data[i], send);
    }
  }

  callDiscoveryOne(key:string, val:string, send = true) {
    const vals = val.split('|');
    const nodeName = vals[0];
    const weight = parseInt(vals[1]);
    const protocol = vals[2];
    const [ , , , serverName, serverIp ] = key.split('/');
    getGroupOrCreate(this.app, serverName).add(newServer({ name: nodeName, ip: serverIp, weight, protocol }), send);
  }


}
