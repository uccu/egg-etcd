import { EggAppConfig, PowerPartial } from 'egg';

export default function () {
    const config = {} as PowerPartial<EggAppConfig>;

    config.keys = 'etcd'

    config.etcd = {

        // endpoints
        hosts: [
            '127.0.0.1:11179'
        ],

        leaseTTL: 5,

        dialTimeout: 5000,

        serverName: 'etcd',

        nodeName: 'node01',

        serverWeight: 1,

        serverIp: 'localhost',

    };

    return config;
}