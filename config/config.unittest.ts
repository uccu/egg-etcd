import { EggAppInfo } from 'egg';
import path from 'node:path';

export default function(appInfo: EggAppInfo) {

  return {
    etcd: {
      nodeName: 'UNITTEST_NODE',
    },
    logger: {
      level: 'DEBUG',
      dir: path.join(appInfo.baseDir, './logs'),
    },
  };
}
