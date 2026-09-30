import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { freePort, run, startWorker } from './local-worker.mjs';

const directory = await mkdtemp(join(tmpdir(), 'gym-paradise-test-'));
let worker;
try {
  worker = await startWorker(directory, await freePort());
  await run(
    process.execPath,
    ['--experimental-strip-types', 'tests/api-smoke.mjs'],
    {
      env: { ...process.env, GYM_TEST_ORIGIN: worker.origin },
    },
  );
} finally {
  await worker?.close();
  await rm(directory, { recursive: true, force: true });
}
