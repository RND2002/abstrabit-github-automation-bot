import { Router } from 'express';
import * as repoController from './repo.controller';
import { requireAuth } from '../../core/middleware/auth.middleware';
import { asyncHandler } from '../../core/middleware/asyncHandler';

const router: Router = Router();

router.use(asyncHandler(requireAuth));

router.get('/github', asyncHandler(repoController.listGithubRepos));
router.get('/', asyncHandler(repoController.getConnectedRepos));
router.post('/', asyncHandler(repoController.connectRepo));
router.patch('/:id/settings', asyncHandler(repoController.updateRepoSettings));
router.delete('/:id', asyncHandler(repoController.disconnectRepo));

export default router;
