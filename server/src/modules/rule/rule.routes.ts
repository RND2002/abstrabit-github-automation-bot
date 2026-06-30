import { Router } from 'express';
import * as ruleController from './rule.controller';
import { requireAuth } from '../../core/middleware/auth.middleware';
import { asyncHandler } from '../../core/middleware/asyncHandler';

const router: Router = Router();

router.use(asyncHandler(requireAuth));

router.get('/repo/:repoId', asyncHandler(ruleController.getRules));
router.post('/slack/verify', asyncHandler(ruleController.verifySlackWebhook));
router.post('/', asyncHandler(ruleController.createRule));
router.delete('/:id', asyncHandler(ruleController.deleteRule));

export default router;
