import { Application, EggApplication } from 'egg';
import Server from './server';

export const emitters: { [key: string]: (() => void)[] } = {
  nodeChanged: [],
};


export const groups: { [key: string]: Group } = {};


export function getGroups(): { [key: string]: Group } {
  return groups;
}

export default class Group {

  private name: string;
  private app: EggApplication;
  private p = 0;
  private queue: number[] = [];

  public serverList: Server[] = [];

  constructor(app: EggApplication, name: string) {
    this.app = app;
    this.name = name;
    groups[this.name] = this;
  }

  toString() {
    return JSON.stringify(this.serverList);
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
    if (server instanceof Server) {
      ip = server.ip;
    } else {
      ip = server;
    }

    for (let i = 0; i < this.serverList.length; i++) {
      if (this.serverList[i].ip === ip) {
        const server = this.serverList[i];
        this.serverList = this
          .serverList.slice(0, i)
          .concat(...this.serverList.slice(i + 1));
        this.setQueue();
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

  next(): Server | null {
    if (this.queue.length === 0) return null;
    this._movePoint();
    return this.serverList[this.queue[this.p]] || this.next();
  }

  sendToApp(type: string, server: Server): void {

    if (this.app.options.type === 'agent') {
      this.app.messenger.sendToApp('discovery', { name: this.name, type, server });
    } else {
      if (emitters.nodeChanged.length > 0) {
        emitters.nodeChanged.forEach((e: (type: string, server: Server) => void) => e(type, server));
      } else if (this.app instanceof Application) {
        this.app.logger.info('node changed', JSON.stringify(this.app.etcd.getAllServers()));
      }

    }
  }

}

export function getGroup(app: EggApplication, name: string) {
  if (groups[name]) {
    return groups[name];
  }
  return new Group(app, name);
}
