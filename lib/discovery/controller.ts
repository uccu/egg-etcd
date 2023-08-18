import { EggApplication } from 'egg';
import { Group, getGroup, getGroups } from './group';
import EtcdClient from '../etcd/client';
import { IKeyValue } from 'etcd3';
import { Server } from './server';
import { EventEmitter } from 'node:events';


export default class Controller extends EventEmitter {

  app: EggApplication;

  constructor(app: EggApplication) {
    super();
    this.app = app;
  }

  getNextServer(name: string): Server | undefined {
    return getGroup(name)?.next();
  }

  getGroup(name: string): Group | undefined {
    return getGroup(name);
  }

  getAllServers(): { [key: string]: Server[] } {
    return Object.fromEntries(getGroups().map(g => [ g.name, g.serverList ]));
  }

  async updateServer({ serverName, nodeName, serverIp, weight, protocol }) {
    return EtcdClient.client.put(this.app.config.etcd.projectName + '/' + this.app.config.env + '/discovery/' + serverName + '/' + serverIp, nodeName + '|' + weight + '|' + protocol, true);
  }

  put(key: string, val: string, ignoreLease = false) {
    return EtcdClient.client.put(key, val, ignoreLease);
  }

  getByPrefix(key: string) {
    return EtcdClient.client.getByPrefix(key);
  }

  async watch(prefix: string, listens: { [key: string]: (kv: IKeyValue) => void }) {
    const watcher = await EtcdClient.client.watch(prefix);

    if (listens.put) watcher.on('put', listens.put);
    if (listens.delete) watcher.on('delete', listens.delete);
  }

  unwatch(prefix: string) {
    return EtcdClient.client.unwatch(prefix);
  }

  on(eventName: 'nodeChanged', listener: (type: string, server: Server) => void): this;
  on(eventName: 'ready', listener: () => void): this;
  on(eventName: string | symbol, listener: (...args: any[]) => void): this;

  on(eventName: string | symbol, listener: (...args: any[]) => void): this {
    return super.on(eventName, listener);
  }

  once(eventName: 'ready', listener: () => void): this;
  once(eventName: string | symbol, listener: (...args: any[]) => void): this;

  once(eventName: string | symbol, listener: (...args: any[]) => void): this {
    return super.on(eventName, listener);
  }
}
