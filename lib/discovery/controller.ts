import { EggApplication } from 'egg';
import Group, { getGroup, getGroups, emitters as groupEmitters } from './group';
import Server from './server';
import EtcdClient from '../etcd/client';
import { IKeyValue } from 'etcd3';


export default class Controller {

  app: EggApplication;

  constructor(app: EggApplication) {
    this.app = app;
  }

  getNextServer(name: string): Server | null {
    return getGroup(this.app, name).next();
  }

  getGroup(name: string): Group {
    return getGroup(this.app, name);
  }

  getAllServers(): { [key: string]: Server[] } {
    const groups = getGroups();
    const data: { [key: string]: Server[] } = {};
    for (const k in groups) {
      data[k] = groups[k].getAllServer();
    }
    return data;
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

  on(e: string, listener: (...args) => void) {
    if (e === 'nodeChanged') {
      groupEmitters.nodeChanged.push(listener);
    }
  }
}
