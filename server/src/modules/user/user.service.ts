import * as userRepository from './user.repository';
import { UserCreateInput } from './user.types';

export const upsertFromGithub = async (data: UserCreateInput) => {
  return userRepository.upsertFromGithub(data);
};

export const getUserById = async (id: string) => {
  return userRepository.getById(id);
};
