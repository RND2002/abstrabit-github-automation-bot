import { Router } from 'express';
import * as ruleController from './rule.controller';
import { requireAuth } from '../../core/middleware/auth.middleware';
import { asyncHandler } from '../../core/middleware/asyncHandler';
import { validate } from '../../core/middleware/validate.middleware';
import { createRuleBodySchema, verifySlackBodySchema } from './rule.schema';

const router: Router = Router();

router.use(asyncHandler(requireAuth));

router.get('/repo/:repoId', asyncHandler(ruleController.getRules));
router.post('/slack/verify', validate(verifySlackBodySchema), asyncHandler(ruleController.verifySlackWebhook));
router.post('/', validate(createRuleBodySchema), asyncHandler(ruleController.createRule));
router.delete('/:id', asyncHandler(ruleController.deleteRule));

export default router;
