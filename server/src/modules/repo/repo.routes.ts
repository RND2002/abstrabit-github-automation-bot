import { Router } from 'express';
import * as repoController from './repo.controller';
import { requireAuth } from '../../core/middleware/auth.middleware';
import { asyncHandler } from '../../core/middleware/asyncHandler';
import { validate } from '../../core/middleware/validate.middleware';
import { connectRepoBodySchema, updateRepoSettingsBodySchema } from './repo.schema';

const router: Router = Router();

router.use(asyncHandler(requireAuth));

router.get('/github', asyncHandler(repoController.listGithubRepos));
router.get('/', asyncHandler(repoController.getConnectedRepos));
router.post('/', validate(connectRepoBodySchema), asyncHandler(repoController.connectRepo));
router.patch('/:id/settings', validate(updateRepoSettingsBodySchema), asyncHandler(repoController.updateRepoSettings));
router.delete('/:id', asyncHandler(repoController.disconnectRepo));

export default router;
