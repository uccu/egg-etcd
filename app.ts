import { Application, IBoot } from 'egg';
import Controller from './lib/controller';
import DiscoveryClient from './lib/discoveryClient';

export default class FooBoot implements IBoot {

  private readonly app: Application;

  constructor(app: Application) {
    this.app = app;
  }

  configDidLoad() {
    DiscoveryClient.importEnv(this.app);
  }

  async didLoad() {
    this.app.etcd = new Controller(this.app);
    this.app.etcd.discoveryClient.bindListeners();
    this.app.etcd.configClient.bindListeners();
  }

  async serverDidReady() {
    this.app.logger.debug('[etcd] send etcd-worker-ready');
    this.app.messenger.sendToAgent('etcd-worker-ready', { pid: process.pid });
  }

}
