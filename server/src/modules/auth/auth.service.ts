import { exchangeCodeForToken, getUserProfile } from '../../integrations/github/github.client';
import { upsertFromGithub } from '../user/user.service';
import { createSession } from '../session/session.service';

export const handleGithubCallback = async (code: string) => {
  const accessToken = await exchangeCodeForToken(code);

  const profile = await getUserProfile(accessToken);

  const user = await upsertFromGithub({
    githubId: profile.id.toString(),
    email: profile.email,
    username: profile.login,
    avatarUrl: profile.avatar_url,
  });

  const session = await createSession(user.id, accessToken);

  return { user, session };
};
