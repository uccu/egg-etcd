import { Application, IBoot } from 'egg';
import { Group, getGroupOrCreate, getGroups } from './lib/discovery/group';
import Controller from './lib/discovery/controller';
import EtcdClient from './lib/etcd/client';
import DiscoveryClient from './lib/discovery/client';

export default class FooBoot implements IBoot {

  private readonly app: Application;
  private etcdServerSucceed = false;

  constructor(app: Application) {
    this.app = app;
    EtcdClient.init(app);
    DiscoveryClient.init(app);
  }

  configDidLoad() {
    DiscoveryClient.client.importEnv();
  }

  async didLoad() {
    this.app.etcd = new Controller(this.app);
    this.app.messenger.on('etcd-server-response', ({ type, groups }: { type: 'add'|'remove', groups: Group[] }) => {
      this.app.logger.debug('[etcd] get etcd-worker-response');
      for (const g of groups) {
        const group = getGroupOrCreate(this.app, g.name);
        switch (type) {
          case 'remove':
            g.serverList.forEach(s => group.remove(s));
            break;
          default:
            g.serverList.forEach(s => group.add(s));
            break;
        }
      }

      this.app.logger.debug('[etcd] app current servers: %s', JSON.stringify(getGroups()));

      if (!this.etcdServerSucceed) {
        this.etcdServerSucceed = true;
        this.app.messenger.sendToAgent('etcd-worker-succeed', { pid: process.pid });
        this.app.logger.debug('[etcd] send etcd-worker-succeed');
      }

      this.app.etcd.emit('ready');
    });
  }

  async serverDidReady() {
    this.app.logger.debug('[etcd] send etcd-worker-ready');
    this.app.messenger.sendToAgent('etcd-worker-ready', { pid: process.pid });
  }

}
