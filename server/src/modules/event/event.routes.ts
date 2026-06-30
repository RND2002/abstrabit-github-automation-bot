import { Router } from 'express';
import * as eventController from './event.controller';
import { requireAuth } from '../../core/middleware/auth.middleware';
import { asyncHandler } from '../../core/middleware/asyncHandler';

const router: Router = Router();

router.use(asyncHandler(requireAuth));

router.get('/global', asyncHandler(eventController.listGlobalEvents));
router.get('/repo/:repoId', asyncHandler(eventController.listEvents));
router.post('/:eventId/retry', asyncHandler(eventController.retryEvent));

export default router;
