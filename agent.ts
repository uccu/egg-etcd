import { Agent, IBoot } from 'egg';
import DiscoveryClient from './lib/discoveryClient';
import Controller from './lib/controller';

export default class FooBoot implements IBoot {

  private app: Agent;
  private ready = false;
  private lease = false;
  private response = false;
  private workerIsReady = false;
  private workerReadySet = new Set<number>();
  private workerSucceedSet = new Set<number>();

  queue: (()=> void)[] = [];

  constructor(app: Agent) {
    this.app = app;
  }

  configDidLoad() {
    DiscoveryClient.importEnv(this.app);
  }

  async didLoad() {

    this.app.etcd = new Controller(this.app);

    this.app.messenger.on('etcd-worker-ready', ({ pid }: { pid: number }) => {
      this.workerReady(pid);
    });

    this.app.messenger.on('etcd-worker-succeed', ({ pid }: { pid: number }) => {
      this.workerSucceed(pid);
    });

  }

  workerSucceed(pid: number) {
    this.workerSucceedSet.add(pid);

    // @ts-ignore
    const workers = this.app.options.workers || 1;
    this.app.logger.debug('[etcd] get etcd-worker-succeed (%d/%d)', this.workerReadySet.size, workers);
    // @ts-ignore
    if (this.workerSucceedSet.size === workers) {
      // 所有 worker 都已经同步了 servers
      // 注册服务
      if (!this.lease) {
        this.lease = true;
        this.app.etcd.discoveryClient.leaseAndPutToDiscovery();
      }
      this.app.etcd.emit('ready', this.app.etcd.ctx);

    }
  }

  workerReady(pid: number) {
    this.workerReadySet.add(pid);

    // @ts-ignore
    const workers = this.app.options.workers || 1;
    this.app.logger.debug('[etcd] get etcd-worker-ready (%d/%d)', this.workerReadySet.size, workers);
    if (this.workerReadySet.size === workers) {
      // 所有 worker 都已经 ready
      this.workerIsReady = true;
      if (!this.response && this.ready) {
        this.send();
      }
    }

    // 应用进程重启后重新同步服务
    if (!workers || this.workerReadySet.size > workers) {
      this.app.etcd.discoveryClient.syncToApp(pid);
      this.app.etcd.configClient.syncToApp({ pid });
    }
  }

  // 同步服务到workers
  async send() {
    this.response = true;
    this.app.etcd.enabled = true;
    this.app.etcd.discoveryClient.syncToApp();
    this.app.etcd.configClient.syncToApp();
    this.app.logger.debug('[etcd] etcd synced');
    this.app.logger.info('[etcd] Send all serverinfo to app, %s', JSON.stringify(this.app.etcd.getAllServers()));
  }

  async serverDidReady(): Promise<void> {
    // 监听服务 & 拉取服务
    await this.app.etcd.discoveryClient.watch();
    await this.app.etcd.discoveryClient.sync();

    await this.app.etcd.configClient.watch();
    await this.app.etcd.configClient.sync();
    this.ready = true;
    if (!this.response && this.workerIsReady) {
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
    if (this.app.etcd.etcdClient.lease) {
      await this.app.etcd.etcdClient.lease.revoke();
    }
    this.app.etcd.etcdClient.close();
  }
}
