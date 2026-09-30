import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { access, readdir } from 'node:fs/promises';
import { createServer } from 'node:net';
import { resolve } from 'node:path';
import { setTimeout as delay } from 'node:timers/promises';

const wrangler = resolve('node_modules/wrangler/bin/wrangler.js');
const config = resolve('dist/server/wrangler.json');

export async function run(command, args, options = {}) {
  const child = spawn(command, args, { stdio: 'inherit', ...options });
  const [code, signal] = await once(child, 'exit');
  if (code !== 0) throw new Error(`${command} failed (${signal || code}).`);
}

export async function freePort() {
  const server = createServer();
  server.listen(0, '127.0.0.1');
  await once(server, 'listening');
  const port = server.address().port;
  await new Promise((resolve) => server.close(resolve));
  return port;
}

export async function startWorker(persistTo, port) {
  try {
    await access(config);
  } catch {
    throw new Error('Build the app first: npm run build');
  }
  const common = ['--config', config, '--persist-to', persistTo];
  // Wrangler tracks applied migrations, so restarting preserves local saves.
  const migrations = (await readdir('drizzle')).filter((f) =>
    f.endsWith('.sql'),
  );
  if (!migrations.length) throw new Error('No database migrations found.');
  await run(
    process.execPath,
    [wrangler, 'd1', 'migrations', 'apply', 'DB', '--local', ...common],
    { env: { ...process.env, CI: 'true', WRANGLER_SEND_METRICS: 'false' } },
  );
  const child = spawn(
    process.execPath,
    [
      wrangler,
      'dev',
      '--ip',
      '127.0.0.1',
      '--port',
      String(port),
      '--inspector-port',
      '0',
      '--log-level',
      'warn',
      ...common,
    ],
    {
      stdio: 'inherit',
      env: { ...process.env, WRANGLER_SEND_METRICS: 'false' },
    },
  );
  let spawnError;
  child.on('error', (error) => {
    spawnError = error;
  });
  const stop = async () => {
    if (child.exitCode !== null || child.signalCode !== null || spawnError)
      return;
    const exited = once(child, 'exit');
    child.kill('SIGTERM');
    const timeout = setTimeout(() => child.kill('SIGKILL'), 5000);
    try {
      await exited;
    } finally {
      clearTimeout(timeout);
    }
  };
  const stopOnSignal = () => {
    void stop();
  };
  process.once('SIGINT', stopOnSignal);
  process.once('SIGTERM', stopOnSignal);
  const close = async () => {
    process.off('SIGINT', stopOnSignal);
    process.off('SIGTERM', stopOnSignal);
    await stop();
  };
  const origin = `http://127.0.0.1:${port}`;
  try {
    for (let attempt = 0; attempt < 120; attempt++) {
      if (spawnError) throw spawnError;
      if (child.exitCode !== null || child.signalCode !== null)
        throw new Error('Local Worker exited before it was ready.');
      try {
        const response = await fetch(`${origin}/api/state`, {
          signal: AbortSignal.timeout(1000),
        });
        await response.arrayBuffer();
        if (response.status === 401) return { origin, close };
      } catch {
        /* Worker is still starting. */
      }
      await delay(250);
    }
    throw new Error('Local Worker did not become ready within 30 seconds.');
  } catch (error) {
    await close();
    throw error;
  }
}
