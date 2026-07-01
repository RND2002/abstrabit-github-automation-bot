import React from 'react';
import { Outlet, Link } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { useAppDispatch } from '../store/hooks';
import { logoutUser } from '../store/authSlice';
import { Button } from './ui/button';
import { LogOut, GitBranch } from 'lucide-react';

export const Layout: React.FC = () => {
  const { user } = useSelector((state: any) => state.auth);
  const dispatch = useAppDispatch();

  const handleLogout = () => {
    dispatch(logoutUser());
  };

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <header className="sticky top-0 z-50 w-full border-b bg-background">
        <div className="container max-w-[1440px] mx-auto px-4 h-14 flex items-center justify-between">
          <Link to="/" className="flex items-center space-x-2">
            <GitBranch className="h-6 w-6 text-primary" />
            <span className="font-mono font-bold tracking-tight text-lg sm:inline-block hidden">abstrabit</span>
          </Link>
          
          <nav className="flex items-center space-x-4">
            {user && (
              <div className="flex items-center space-x-4">
                <div className="flex items-center space-x-2">
                  {user.avatarUrl && (
                    <img src={user.avatarUrl} alt={user.username} className="w-8 h-8 rounded-full" />
                  )}
                  <span className="text-sm font-medium">{user.username}</span>
                </div>
                <Button variant="ghost" size="sm" onClick={handleLogout}>
                  <LogOut className="h-4 w-4 mr-2" />
                  Logout
                </Button>
              </div>
            )}
          </nav>
        </div>
      </header>

      <main className="flex-1 container mx-auto px-4 py-8">
        <Outlet />
      </main>
    </div>
  );
};
