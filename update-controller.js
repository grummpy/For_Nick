export const UPDATE_CHECK_DELAY_MS = 8_000;
export const UPDATE_CHECK_INTERVAL_MS = 4 * 60 * 60 * 1000;

export function createUpdateController({
  autoUpdater,
  isPackaged,
  isPortable = false,
  sendStatus,
  log = () => {},
  scheduleTimeout = (fn, ms) => setTimeout(fn, ms),
  scheduleInterval = (fn, ms) => setInterval(fn, ms),
  initialDelayMs = UPDATE_CHECK_DELAY_MS,
  intervalMs = UPDATE_CHECK_INTERVAL_MS
}) {
  let readyVersion = '';
  let installRequested = false;
  const handles = [];

  const reportFailure = error => {
    const message = error?.message || String(error || 'Update check failed.');
    log(`Update check failed: ${message}`);
    if (!installRequested) return;
    installRequested = false;
    sendStatus?.({ state: 'error', version: readyVersion, message });
  };

  const start = () => {
    if (!isPackaged || isPortable || !autoUpdater) return false;
    autoUpdater.autoDownload = true;
    autoUpdater.autoInstallOnAppQuit = true;
    autoUpdater.on('update-downloaded', info => {
      readyVersion = info?.version || readyVersion;
      sendStatus?.({ state: 'ready', version: readyVersion });
    });
    autoUpdater.on('error', reportFailure);
    const check = () => {
      try {
        Promise.resolve(autoUpdater.checkForUpdates()).catch(() => {});
      } catch (error) {
        reportFailure(error);
      }
    };
    handles.push(scheduleTimeout(check, initialDelayMs));
    handles.push(scheduleInterval(check, intervalMs));
    return true;
  };

  const install = () => {
    if (!readyVersion) throw new Error('No update is ready to install yet.');
    installRequested = true;
    autoUpdater.quitAndInstall();
  };

  const stop = () => {
    for (const handle of handles) {
      clearTimeout(handle);
      clearInterval(handle);
    }
    handles.length = 0;
  };

  return { start, install, stop };
}
