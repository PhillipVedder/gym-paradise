import { once } from 'node:events';
import { resolve } from 'node:path';
import { createDemoProxy } from './demo-proxy.mjs';
import { freePort, run, startWorker } from './local-worker.mjs';

// npm supplies its CLI location on every supported platform; no shell is needed.
if (!process.env.npm_execpath) throw new Error('Start with npm run demo.');
await run(process.execPath, [process.env.npm_execpath, 'run', 'build']);
const worker = await startWorker(resolve('.wrangler/demo'), await freePort());
const proxy = createDemoProxy(worker.origin);
let closing = false;
async function close() {
  if (closing) return;
  closing = true;
  proxy.closeAllConnections();
  await new Promise((resolve) => proxy.close(resolve));
  await worker.close();
}
process.once('SIGINT', () => {
  void close();
});
process.once('SIGTERM', () => {
  void close();
});
try {
  proxy.listen(3000, '127.0.0.1');
  await once(proxy, 'listening');
  console.log('\nGym Paradise demo: http://127.0.0.1:3000');
  console.log('Local demo account • saves in .wrangler/demo • Ctrl+C to stop');
  console.log(
    'Open Example gym → Load example gym to explore the full collection.\n',
  );
} catch (error) {
  await close();
  throw error;
}
