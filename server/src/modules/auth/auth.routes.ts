import { Router } from 'express';
import * as authController from './auth.controller';
import { requireAuth } from '../../core/middleware/auth.middleware';
import { asyncHandler } from '../../core/middleware/asyncHandler';

const router: Router = Router();

router.get('/redirect', authController.redirect);
router.get('/callback', asyncHandler(authController.callback));
router.post('/logout', asyncHandler(requireAuth), asyncHandler(authController.logout));
router.get('/me', asyncHandler(requireAuth), authController.me);

export default router;
