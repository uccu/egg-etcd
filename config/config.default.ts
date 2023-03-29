import { IOptions } from 'etcd3';

export default function() {


  const options: IOptions = {
    hosts: [
      '127.0.0.1:2379',
    ],
    dialTimeout: 5000,
  };

  const etcd = {

    options,
    leaseTTL: 5,

    projectName: 'etcd',
    serverName: 'etcd',
    nodeName: 'node01',

    serverIp: 'localhost',
    serverWeight: 1,

  };

  return {
    keys: 'etcd', etcd,
  };
}
