# egg-etcd-discovery

provides egg bindings for the etcd.

[![npm download](https://img.shields.io/github/actions/workflow/status/uccu/egg-etcd-discovery/npm-publish.yml)](https://github.com/uccu/egg-etcd-discovery/actions/workflows/npm-publish.yml)
[![NPM version][npm-image]][npm-url]
[![GitHub issues](https://img.shields.io/github/issues/uccu/egg-etcd-discovery)](https://github.com/uccu/egg-etcd-discovery/issues)
![GitHub](https://img.shields.io/github/license/uccu/egg-etcd-discovery)

[npm-image]: https://img.shields.io/npm/v/egg-etcd-discovery.svg?style=flat-square
[npm-url]: https://npmjs.org/package/egg-etcd-discovery
[download-image]: https://img.shields.io/npm/dm/egg-etcd-discovery.svg?style=flat-square
[download-url]: https://npmjs.org/package/egg-etcd-discovery

## Install

```bash
$ npm i egg-etcd-discovery --save
```

## Usage

```js
// {app_root}/config/plugin.ts
{
  enable: true,
  package: 'egg-etcd-discovery',
}

/** 
 * anywhere get server
 * @param string serverName
 * @return {ip: string, weight: number}
 * /
this.app.etcd.get(serverName);

```

## Configuration

```js
// {app_root}/config/config.default.js
exports.eggEtcdDiscovery = {
  hosts: [
      '172.17.0.1:2379', '72.17.0.2:2379', '72.17.0.3:2379'
  ],
  leaseTTL: 5,
  dialTimeout: 5000,
  serverName: 'etcd',
  serverWeight: 1,
  serverIp: 'localhost:8080',
};
```

see [config/config.default.ts](config/config.default.ts) for more detail.

## Example

<!-- example here -->

## Questions & Suggestions

Please open an issue [here](https://github.com/uccu/egg-etcd-discovery/issues).

## License

[MIT](LICENSE)
