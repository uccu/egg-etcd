import { EggApplication } from 'egg';
import { Group } from './group';
import EtcdClient from './etcdClient';
import { IKeyValue } from 'etcd3';
import { Server } from './server';
import { EventEmitter } from 'node:events';
import DiscoveryClient from './discoveryClient';
import ConfigClient from './configClient';

export class Context {

  runList: (()=> Promise<void>)[] = [];
  p: (()=> Promise<void>) | undefined;
  pi: Promise<void> | undefined;
  r: (value: void | PromiseLike<void>)=> void;

  async done() {
    if (this.pi) {
      return this.pi;
    }
  }

  next() {
    if (this.p) {
      return;
    }

    const p = this.runList.shift();
    if (p) {
      if (!this.pi) {
        this.pi = new Promise(r => {
          this.r = r;
        });
      }
      this.p = p;
      p().then(() => {
        this.p = undefined;
        this.next();
      });
    } else if (this.r) {
      this.pi = undefined;
      this.r();
    }

  }

  run(r: ()=> Promise<void>) {
    this.runList.push(r);
    this.next();
  }

}


export default class Controller extends EventEmitter {

  app: EggApplication;
  enabled = false;
  ctx: Context;
  etcdClient: EtcdClient;
  discoveryClient: DiscoveryClient;
  configClient: ConfigClient;

  constructor(app: EggApplication) {
    super();
    this.app = app;
    this.ctx = new Context();
    this.etcdClient = new EtcdClient(app);
    this.discoveryClient = new DiscoveryClient(app);
    this.configClient = new ConfigClient(app);
  }

  getNextServer(name: string): Server | undefined {
    return this.discoveryClient.getGroup(name)?.next();
  }

  getGroup(name: string): Group | undefined {
    return this.discoveryClient.getGroup(name);
  }

  getAllServers(): { [key: string]: Server[] } {
    return Object.fromEntries(this.discoveryClient.getGroups().map(g => [ g.name, g.serverList ]));
  }

  async updateServer({ serverName, nodeName, serverIp, weight, protocol }) {
    return this.etcdClient.put(this.app.config.etcd.projectName + '/' + this.app.config.env + '/discovery/' + serverName + '/' + serverIp, nodeName + '|' + weight + '|' + protocol, true);
  }

  put(key: string, val: string, ignoreLease = false) {
    return this.etcdClient.put(key, val, ignoreLease);
  }

  delete(key: string) {
    return this.etcdClient.delete(key);
  }

  getByPrefix(key: string) {
    return this.etcdClient.getByPrefix(key);
  }

  async watch(prefix: string, listens: { [key: string]: (kv: IKeyValue)=> void }) {
    const watcher = await this.etcdClient.watch(prefix);

    if (listens.put) watcher.on('put', listens.put);
    if (listens.delete) watcher.on('delete', listens.delete);
  }

  unwatch(prefix: string) {
    return this.etcdClient.unwatch(prefix);
  }

  on(eventName: 'nodeChanged', listener: (type: string, server: Server)=> void): this;
  on(eventName: 'ready', listener: (ctx?: Context)=> void): this;
  on(eventName: 'beforeReady', listener: (ctx?: Context)=> void): this;
  on(eventName: 'configChanged', listener: (ctx: Context, name: string, value: unknown)=> void): this;
  on(eventName: string | symbol, listener: (...args: any[])=> void): this;

  on(eventName: string | symbol, listener: (...args: any[])=> void): this {
    return super.on(eventName, listener);
  }

  once(eventName: 'ready', listener: (ctx?: Context)=> void): this;
  once(eventName: 'beforeReady', listener: (ctx?: Context)=> void): this;
  once(eventName: 'configChanged', listener: (ctx: Context, name: string, value: unknown)=> void): this;
  once(eventName: string | symbol, listener: (...args: any[])=> void): this;

  once(eventName: string | symbol, listener: (...args: any[])=> void): this {
    return super.once(eventName, listener);
  }
}
