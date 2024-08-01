import assert from 'node:assert';
import mock, { MockApplication } from 'egg-mock';
import { Context } from 'lib/controller';

describe('test/service/config.test.ts', () => {
  let app: MockApplication;
  before(async () => {
    // mock.env('local');
    app = mock.app();
    await app.ready();
    return new Promise(r => {
      app.etcd.once('ready', (ctx: Context) => {
        ctx.done().then(r);
      });
    });
  });

  it('config should change', async () => {
    const prefix = app.config.etcd.projectName + '/' + app.config.env + '/config/';
    const key = 'abc';

    await app.etcd.delete(prefix + key);
    await app.etcd.put(prefix + key, JSON.stringify({ a: 1 }));

    await new Promise(r => {
      const t = setTimeout(r, 1000);
      app.etcd.once('configChanged', function(_, name, value) {
        clearTimeout(t);
        assert.strictEqual(name, key);
        assert.deepEqual(value, { a: 1 });
        assert.deepEqual(app.config[name], { a: 1 });
        r(true);
      });
    });


  });

});
