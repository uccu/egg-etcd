import { EggApplication } from 'egg';
import EtcdClient from '../etcd/client';
import { getGroup } from './group';
import Server from './server';
import { IKeyValue } from 'etcd3';

export default class DiscoveryClient {

  static client: DiscoveryClient;

  static init(app: EggApplication) {
    DiscoveryClient.client = new DiscoveryClient(app);
  }

  app: EggApplication;
  WATCH_PREFIX: string;
  LEASE_KEY: string;
  serverWeight: number;

  constructor(app: EggApplication) {
    this.app = app;
  }

  importEnv() {
    const etcdConfig = this.app.config.etcd;
    if (process.env.SERVER_WEIGHT) etcdConfig.serverWeight = parseInt(process.env.SERVER_WEIGHT);
    if (process.env.PROJECT_NAME) etcdConfig.projectName = process.env.PROJECT_NAME;
    if (process.env.SERVER_IP) etcdConfig.serverIp = process.env.SERVER_IP;
    if (process.env.NODE_NAME) etcdConfig.nodeName = process.env.NODE_NAME;
    etcdConfig.nodeName = etcdConfig.nodeName || etcdConfig.serverIp;
    if (process.env.SERVER_NAME) etcdConfig.serverName = process.env.SERVER_NAME;

    this.WATCH_PREFIX = etcdConfig.projectName + '/' + this.app.config.env + '/discovery/';
    this.LEASE_KEY = this.WATCH_PREFIX + etcdConfig.serverName + '/' + etcdConfig.serverIp;

    this.serverWeight = etcdConfig.serverWeight;
  }


  async watchDiscoveryServer() {
    const watcher = await EtcdClient.client.watch(this.WATCH_PREFIX);
    watcher.on('connected', async () => {
      await EtcdClient.client.resetLease();
      return this.callDiscovery();
    });
    watcher.on('put', (res: IKeyValue) => {
      this.callDiscoveryOne(res.key.toString(), res.value.toString());
    });
    watcher.on('delete', (res: IKeyValue) => {
      const [ , , , serverName, serverIp ] = res.key.toString().split('/');
      getGroup(this.app, serverName).remove(serverIp);
    });
  }

  leaseAndPutToDiscovery() {
    return EtcdClient.client.setLease(this.LEASE_KEY, this.serverWeight + '');
  }

  async callDiscovery() {
    const data = await EtcdClient.client.getByPrefix(this.WATCH_PREFIX);
    for (const i in data) {
      this.callDiscoveryOne(i, data[i]);
    }
  }

  callDiscoveryOne(key:string, val:string) {
    const vals = val.split('|');
    const nodeName = vals[0];
    const weight = parseInt(vals[1]);
    const [ , , , serverName, serverIp ] = key.split('/');
    getGroup(this.app, serverName).add(new Server(nodeName, serverIp, weight));
  }


}
