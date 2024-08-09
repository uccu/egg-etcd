import { EggApplication } from 'egg';
import { hostname } from 'node:os';
import { Group } from './group';
import { newServer } from './server';
import { IKeyValue } from 'etcd3';

export default class DiscoveryClient {

  etcdServerSucceed = false;

  groups: Set<Group> = new Set();

  getGroups(): Group[] {
    return [ ...this.groups ];
  }

  getGroup(name: string): Group | undefined {
    return this.getGroups().find(g => g.name === name);
  }

  getGroupOrCreate(app: EggApplication, name: string): Group {
    const group = this.getGroups().find(g => g.name === name);
    if (group) {
      return group;
    }

    const group2 = new Group(app, name);
    this.groups.add(group2);
    return group2;
  }


  constructor(private app: EggApplication) {
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

  static importEnv(app: EggApplication) {
    const etcdConfig = app.config.etcd || {};
    if (process.env.SERVER_WEIGHT) etcdConfig.serverWeight = parseInt(process.env.SERVER_WEIGHT);
    if (process.env.PROJECT_NAME) etcdConfig.projectName = process.env.PROJECT_NAME;
    if (process.env.SERVER_IP) etcdConfig.serverIp = process.env.SERVER_IP;
    if (process.env.NODE_NAME) etcdConfig.nodeName = process.env.NODE_NAME;
    if (process.env.SERVER_NAME) etcdConfig.serverName = process.env.SERVER_NAME;

    etcdConfig.nodeName = etcdConfig.nodeName || hostname();
    etcdConfig.protocol = etcdConfig.protocol || 'no';

  }


  async watch() {
    return this.app.etcd.watch(this.watchPrefix, {
      put: (res: IKeyValue) => {
        this.callDiscoveryOne(res.key.toString(), res.value.toString());
      },
      delete: (res: IKeyValue) => {
        const [ , , , serverName, serverIp ] = res.key.toString().split('/');
        this.getGroup(serverName)?.remove(serverIp);
      },
    });
  }

  leaseAndPutToDiscovery() {
    return this.app.etcd.etcdClient.setLease(this.leaseKey, this.leaseVal);
  }

  async sync() {
    const data = await this.app.etcd.getByPrefix(this.watchPrefix);
    for (const i in data) {
      this.callDiscoveryOne(i, data[i]);
    }
  }

  callDiscoveryOne(key: string, val: string) {
    const vals = val.split('|');
    const nodeName = vals[0];
    const weight = parseInt(vals[1]);
    const protocol = vals[2];
    const [ , , , serverName, serverIp ] = key.split('/');
    this.getGroupOrCreate(this.app, serverName).add(newServer({ name: nodeName, ip: serverIp, weight, protocol }));
  }

  bindListeners() {
    this.app.messenger.on('etcd-server-response', ({ type, groups }: { type: 'add' | 'remove'; groups: Group[] }) => {
      this.app.logger.debug('[etcd] get etcd-worker-response');
      for (const g of groups) {
        const group = this.getGroupOrCreate(this.app, g.name);
        switch (type) {
          case 'remove':
            g.serverList.forEach(s => group.remove(s));
            break;
          default:
            g.serverList.forEach(s => group.add(s));
            break;
        }
      }

      this.app.logger.debug('[etcd] app current servers: %s', JSON.stringify(this.getGroups()));

      if (!this.etcdServerSucceed) {
        this.etcdServerSucceed = true;
        this.app.etcd.emit('beforeReady', this.app.etcd.ctx);
        this.app.etcd.ctx.done().then(() => {
          this.app.messenger.sendToAgent('etcd-worker-succeed', { pid: process.pid });
          this.app.logger.debug('[etcd] send etcd-worker-succeed');
          this.app.etcd.emit('ready', this.app.etcd.ctx);
        });
      }

    });
  }

  syncToApp(pid?: number) {

    if (!this.app.etcd.enabled) {
      return;
    }
    const groups = this.getGroups();
    if (pid) {
      this.app.messenger.sendTo(pid, 'etcd-server-response', { type: 'add', groups });
    } else {
      this.app.messenger.sendToApp('etcd-server-response', { type: 'add', groups });
    }
  }

}
