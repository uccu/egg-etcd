import { Agent, IBoot } from 'egg';
import EtcdClient from './lib/etcd/client';
import DiscoveryClient from './lib/discovery/client';
import Controller from './lib/discovery/controller';
import { getGroups } from '.';

export default class FooBoot implements IBoot {

  private app: Agent;
  private ready = false;
  private lease = false;
  private response = false;
  private workerIsReady = false;
  private workerReadySet = new Set<number>();
  private workerSucceedSet = new Set<number>();

  queue:(()=>void)[] = [];

  constructor(app: Agent) {
    this.app = app;
    EtcdClient.init(app);
    DiscoveryClient.init(app);
  }

  configDidLoad() {
    DiscoveryClient.client.importEnv();
  }

  async didLoad() {

    this.app.etcd = new Controller(this.app);

    this.app.messenger.on('etcd-worker-ready', ({ pid }: { pid: number }) => {
      this.app.logger.debug('[etcd] get etcd-worker-ready');
      this.workerReady(pid);
    });

    this.app.messenger.on('etcd-worker-succeed', ({ pid }: { pid: number }) => {
      this.app.logger.debug('[etcd] get etcd-worker-succeed');
      this.workerSucceed(pid);
    });

  }

  workerSucceed(pid:number) {
    this.workerSucceedSet.add(pid);
    if (this.workerSucceedSet.size === this.app.options.workers) {
      // 所有 worker 都已经同步了 servers
      // 注册服务
      if (!this.lease) {
        this.lease = true;
        DiscoveryClient.client.leaseAndPutToDiscovery();
      }
      this.app.etcd.emit('ready');

    }
  }

  workerReady(pid:number) {
    this.workerReadySet.add(pid);
    if (this.workerReadySet.size === this.app.options.workers) {
      // 所有 worker 都已经 ready
      this.workerIsReady = true;
      if (!this.response && this.ready) {
        this.response = true;
        this.send();
      }
    }
    if (this.workerReadySet.size > this.app.options.workers) {
      this.app.logger.debug('[etcd] reset');
      this.response = false;
      this.workerReadySet.clear();
      this.workerSucceedSet.clear();
      this.workerReady(pid);
    }
  }

  // 同步服务到workers
  async send() {
    const groups = getGroups();
    this.app.logger.debug('[etcd] send etcd-server-response');
    this.app.logger.info('[etcd] Send all serverinfo to app, %s', JSON.stringify(this.app.etcd.getAllServers()));
    this.app.messenger.sendToApp('etcd-server-response', { type: 'add', groups });
  }

  async serverDidReady(): Promise<void> {
    // 监听服务
    await DiscoveryClient.client.watchDiscoveryServer();
    // 拉取服务
    await DiscoveryClient.client.callDiscovery();

    this.ready = true;
    if (!this.response && this.workerIsReady) {
      this.response = true;
      this.send();
    }
  }

  async didReady() {
    if (this.app.etcd.listenerCount('ready') === 0) {
      this.app.etcd.once('ready', () => {
        this.app.logger.debug('[etcd] ready2');
      });
    }
  }

  async beforeClose() {
    if (EtcdClient.client.lease) {
      await EtcdClient.client.lease.revoke();
    }
    EtcdClient.client.close();
  }
}
