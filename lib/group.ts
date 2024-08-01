import { EggApplication } from 'egg';
import { Server } from './server';


export class Group {

  name: string;
  private app: EggApplication;
  private p = 0;
  private queue: number[] = [];

  public serverList: Server[] = [];

  constructor(app: EggApplication, name: string) {
    this.app = app;
    this.name = name;
  }

  toString() {
    return `Etcd Group [ ${this.name} ]`;
  }

  toJSON() {
    return {
      name: this.name,
      serverList: this.serverList,
    };
  }

  getAllServer(): Server[] {
    return this.serverList;
  }

  setQueue(): void {
    const queue: number[] = [];
    for (let i = 0; i < this.serverList.length; i++) {
      for (let j = 0; j < this.serverList[i].weight; j++) {
        queue.push(i);
      }
    }
    this.queue = queue.sort(() => Math.random() - 0.5);
  }

  add(server: Server): void {
    for (const i in this.serverList) {
      if (this.serverList[i].ip === server.ip) {
        this.serverList[i] = server;
        this.setQueue();
        this.app.etcd.emit('nodeChanged', 'add', server);
        this.sendToApp('add', server);
        return;
      }
    }
    this.serverList.push(server);
    this.setQueue();
    this.sendToApp('add', server);
  }

  remove(server: string | Server) {

    let ip: string;
    if (typeof server === 'string') {
      ip = server;
    } else {
      ip = server.ip;
    }

    for (let i = 0; i < this.serverList.length; i++) {
      if (this.serverList[i].ip === ip) {
        const server = this.serverList[i];
        this.serverList = this
          .serverList.slice(0, i)
          .concat(...this.serverList.slice(i + 1));
        this.setQueue();
        this.app.etcd.emit('nodeChanged', 'remove', server);
        this.sendToApp('remove', server);
        return true;
      }
    }
    return false;
  }

  _movePoint(): void {
    this.p++;
    if (this.queue.length <= this.p) {
      this.p = 0;
    }
  }

  next(): Server | undefined {
    if (this.queue.length === 0) return undefined;
    this._movePoint();
    return this.serverList[this.queue[this.p]] || this.next();
  }

  sendToApp(type: 'remove' | 'add', server: Server): void {
    // @ts-ignore
    if (this.app.options.type === 'agent') {
      this.app.logger.debug('[etcd] send etcd-server-response');
      this.app.logger.info('node changed', JSON.stringify(this.app.etcd.getAllServers()));
      if (this.app.etcd.enabled) this.app.messenger.sendToApp('etcd-server-response', { type, groups: [{ name: this.name, serverList: [ server ] }] });
    }
  }

}

export interface Group {
  name: string;
  serverList: Server[];
}
