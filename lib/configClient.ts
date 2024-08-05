import { EggApplication } from 'egg';
import { IKeyValue } from 'etcd3';

export default class ConfigClient {

  app: EggApplication;
  config: Record<string, any> = {};

  constructor(app: EggApplication) {
    this.app = app;
  }

  get watchPrefix() {
    return this.app.config.etcd.projectName + '/' + this.app.config.env + '/config/';
  }


  async watch() {
    return this.app.etcd.watch(this.watchPrefix, {
      put: (res: IKeyValue) => {
        const name = res.key.toString();
        const op = this.updateConfig(name, res.value.toString());
        if (op) this.syncToApp({ name: op });
      },
    });
  }

  async sync() {
    const map = await this.app.etcd.getByPrefix(this.watchPrefix);
    for (const k in map) {
      this.updateConfig(k, map[k]);
    }
  }

  updateConfig(key: string, val: string) {
    const name = key.slice(this.watchPrefix.length);
    try {
      const value = JSON.parse(val);
      this.config[name] = value;
    } catch (e: any) {
      this.app.logger.error('[etcd] parse config error, %s, %s\n%s', key, val, e.stack);
      return;
    }
    return name;
  }

  bindListeners() {
    this.app.messenger.on('etcd-server-config', (data: {name: string;value: unknown}) => {
      this.app.logger.debug('[etcd] app current config: %s', JSON.stringify(this.config));
      this.app.etcd.emit('configChanged', this.app.etcd.ctx, data.name, data.value);
    });
  }

  syncToApp(req?: {name?: string;pid?: number}) {

    if (!this.app.etcd.enabled) {
      return;
    }

    const sendData: {name: string;value: unknown}[] = [];
    if (req?.name) {
      sendData.push({ name: req.name, value: this.config[req.name] });
    } else {
      for (const name in this.config) {
        sendData.push({ name, value: this.config[name] });
      }
    }

    const pid = req?.pid || 0;

    if (pid) {
      sendData.forEach(data => {
        this.app.messenger.sendTo(pid, 'etcd-server-config', data);
      });

    } else {
      sendData.forEach(data => {
        this.app.messenger.sendToApp('etcd-server-config', data);
      });
    }
  }

}
