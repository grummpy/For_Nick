import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { EventEmitter } from 'node:events';
import { createUpdateController, UPDATE_CHECK_DELAY_MS, UPDATE_CHECK_INTERVAL_MS } from './update-controller.js';

function fakeUpdater() {
  const updater = new EventEmitter();
  updater.autoDownload = false;
  updater.autoInstallOnAppQuit = false;
  updater.checks = 0;
  updater.installs = 0;
  updater.checkForUpdates = () => {
    updater.checks += 1;
    return Promise.resolve(null);
  };
  updater.quitAndInstall = () => { updater.installs += 1; };
  return updater;
}

function harness({ isPackaged = true, isPortable = false, updater = fakeUpdater() } = {}) {
  const statuses = [];
  const logs = [];
  const scheduled = [];
  const controller = createUpdateController({
    autoUpdater: updater,
    isPackaged,
    isPortable,
    sendStatus: status => statuses.push(status),
    log: message => logs.push(message),
    scheduleTimeout: (fn, ms) => { scheduled.push({ fn, ms, kind: 'timeout' }); return scheduled.length; },
    scheduleInterval: (fn, ms) => { scheduled.push({ fn, ms, kind: 'interval' }); return scheduled.length; }
  });
  return { controller, updater, statuses, logs, scheduled };
}

describe('update controller', { concurrency: false }, () => {
  test('does not check or install from an unpackaged or portable run', () => {
    for (const options of [{ isPackaged: false }, { isPortable: true }]) {
      const { controller, updater, scheduled } = harness(options);
      assert.equal(controller.start(), false);
      assert.equal(scheduled.length, 0);
      assert.equal(updater.checks, 0);
      assert.throws(() => controller.install(), /No update is ready/);
      assert.equal(updater.installs, 0);
    }
  });

  test('checks quietly after launch and on a later interval, then installs only when asked', () => {
    const { controller, updater, statuses, scheduled } = harness();
    assert.equal(controller.start(), true);
    assert.equal(updater.autoDownload, true);
    assert.equal(updater.autoInstallOnAppQuit, true);
    assert.deepEqual(scheduled.map(item => [item.kind, item.ms]), [
      ['timeout', UPDATE_CHECK_DELAY_MS],
      ['interval', UPDATE_CHECK_INTERVAL_MS]
    ]);
    assert.equal(updater.checks, 0);
    scheduled[0].fn();
    scheduled[1].fn();
    assert.equal(updater.checks, 2);
    assert.equal(statuses.length, 0);
    updater.emit('update-downloaded', { version: '1.0.4' });
    assert.deepEqual(statuses, [{ state: 'ready', version: '1.0.4' }]);
    controller.install();
    assert.equal(updater.installs, 1);
  });

  test('keeps a failed check from restarting the app', () => {
    const { controller, updater, statuses, logs, scheduled } = harness();
    updater.checkForUpdates = () => {
      updater.checks += 1;
      const error = new Error('offline');
      updater.emit('error', error);
      return Promise.reject(error);
    };
    controller.start();
    scheduled[0].fn();
    assert.equal(updater.checks, 1);
    assert.equal(updater.installs, 0);
    assert.equal(statuses.length, 0);
    assert.match(logs[0], /offline/);
    assert.throws(() => controller.install(), /No update is ready/);
  });

  test('reports an install failure without claiming another check is ready', () => {
    const { controller, updater, statuses } = harness();
    controller.start();
    updater.emit('update-downloaded', { version: '1.0.4' });
    updater.quitAndInstall = () => {
      updater.installs += 1;
      updater.emit('error', new Error('The update is not signed.'));
    };
    controller.install();
    assert.equal(updater.installs, 1);
    assert.deepEqual(statuses.at(-1), { state: 'error', version: '1.0.4', message: 'The update is not signed.' });
  });

  test('publishes updates from the public GitHub repo without a token', async () => {
    const pkg = JSON.parse(await readFile(new URL('./package.json', import.meta.url), 'utf8'));
    assert.equal(pkg.version, '1.0.3');
    assert.equal(pkg.dependencies['electron-updater'].startsWith('^6'), true);
    assert.deepEqual(pkg.build.publish, { provider: 'github', owner: 'grummpy', repo: 'For_Nick' });
    assert.equal(pkg.build.publish.token, undefined);
    assert.equal(pkg.build.publish.private, undefined);
  });
});