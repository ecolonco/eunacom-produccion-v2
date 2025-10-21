import { QASweep2Service } from '../services/qa-sweep-2.service';
import { logger } from '../utils/logger';

async function main() {
  logger.info('QA Sweep 2.0 Worker starting...');
  const svc = new QASweep2Service();
  await svc.workerLoop(3000);
}

main().catch(err => {
  // eslint-disable-next-line no-console
  console.error('Worker fatal error:', err);
  process.exit(1);
});


