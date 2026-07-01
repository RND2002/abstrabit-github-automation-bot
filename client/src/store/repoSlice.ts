import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { Repo, GithubRepo } from '../types';
import * as repoApi from '../api/repo.api';

interface RepoState {
  connectedRepos: Repo[];
  availableRepos: GithubRepo[];
  loading: boolean;
  error: string | null;
}

const initialState: RepoState = {
  connectedRepos: [],
  availableRepos: [],
  loading: false,
  error: null,
};

export const fetchConnectedRepos = createAsyncThunk('repo/fetchConnected', async (_, { rejectWithValue }) => {
  try {
    return await repoApi.getConnectedRepos();
  } catch (error: any) {
    return rejectWithValue(error.response?.data || 'Failed to fetch repos');
  }
});

export const fetchAvailableRepos = createAsyncThunk('repo/fetchAvailable', async (_, { rejectWithValue }) => {
  try {
    return await repoApi.getGithubRepos();
  } catch (error: any) {
    return rejectWithValue(error.response?.data || 'Failed to fetch github repos');
  }
});

const repoSlice = createSlice({
  name: 'repo',
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchConnectedRepos.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchConnectedRepos.fulfilled, (state, action) => {
        state.loading = false;
        state.connectedRepos = action.payload;
      })
      .addCase(fetchConnectedRepos.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      .addCase(fetchAvailableRepos.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchAvailableRepos.fulfilled, (state, action) => {
        state.loading = false;
        state.availableRepos = action.payload;
      })
      .addCase(fetchAvailableRepos.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      });
  },
});

export default repoSlice.reducer;
