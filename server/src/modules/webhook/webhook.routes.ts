import { Router } from 'express';
import * as webhookController from './webhook.controller';
import { asyncHandler } from '../../core/middleware/asyncHandler';

const router: Router = Router();

router.post('/github', asyncHandler(webhookController.handleGithubWebhook)); //webhook

export default router;
