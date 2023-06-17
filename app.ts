import { Application, IBoot } from 'egg';
import Server from './lib/discovery/server';
import { getGroup } from './lib/discovery/group';
import Controller from './lib/discovery/controller';
import EtcdClient from './lib/etcd/client';
import DiscoveryClient from './lib/discovery/client';

export default class FooBoot implements IBoot {

  private readonly app: Application;

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
    this.app.messenger.on('discovery', ({ name, type, server }: { name: string, type: string, server: Server }) => {
      getGroup(this.app, name)[type](new Server(server.name, server.ip, server.weight, server.protocol));
    });
  }

  async serverDidReady() {
    this.app.messenger.sendToAgent('get_discovery', { pid: process.pid });
  }


}
