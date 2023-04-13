import { Agent, IBoot } from 'egg';
import EtcdClient from './lib/etcd/client';
import DiscoveryClient from './lib/discovery/client';
import Controller from './lib/discovery/controller';
import { EtcdControl, getGroups } from '.';

export default class FooBoot implements IBoot {

  private app: Agent;
  private ready = false;

  queue:(()=>void)[] = [];

  constructor(app: Agent) {
    this.app = app;
    EtcdClient.init(app);
    DiscoveryClient.init(app);
  }

  configDidLoad() {
    DiscoveryClient.client.importEnv();
  }

  getc(): EtcdControl {
    return new Controller(this.app);
  }

  async didLoad() {
    this.app.etcd = new Controller(this.app);
    this.app.messenger.on('get_discovery', ({ pid }: { pid: number }) => {
      if (this.ready) {
        return this.getDiscovery(pid);
      }
      this.queue.push(() => {
        this.getDiscovery(pid);
      });
    });
  }

  async getDiscovery(pid:number) {
    const groups = getGroups();
    for (const i in groups) {
      groups[i].sendAllToApp(pid);
    }
    this.app.logger.info('etcd: Send all serverinfo to app, %d, %s', pid, JSON.stringify(this.app.etcd.getAllServers()));
  }

  async serverDidReady(): Promise<void> {
    await DiscoveryClient.client.leaseAndPutToDiscovery();
    await DiscoveryClient.client.watchDiscoveryServer();
    await DiscoveryClient.client.callDiscovery(false);
    this.ready = true;
    this.queue.forEach(q => q());
  }

  async beforeClose() {
    if (EtcdClient.client.lease) {
      await EtcdClient.client.lease.revoke();
    }
    EtcdClient.client.close();
  }
}
