import { Router } from 'express';
import qaSweepFixRoutes from './qa-sweep-fix.routes';

const router = Router();

// QA Sweep Fix routes
router.use('/qa-sweep', qaSweepFixRoutes);

export default router;

