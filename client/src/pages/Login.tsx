import React, { useState } from 'react';
import { Navigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { GitBranch, Loader2 } from 'lucide-react';

export const Login: React.FC = () => {
  const { isAuthenticated, loading } = useSelector((state: any) => state.auth);
  const [isRedirecting, setIsRedirecting] = useState(false);
  const API_URL = import.meta.env.VITE_API_URL;

  if (loading) {
    return <div className="flex justify-center mt-20 font-mono text-muted-foreground">Loading...</div>;
  }

  if (isAuthenticated) {
    return <Navigate to="/" replace />;
  }

  const handleLogin = () => {
    setIsRedirecting(true);
    // Redirect to backend OAuth route
    window.location.href = `${API_URL}/auth/redirect`;
  };

  return (
    <div className="flex h-[80vh] items-center justify-center">
      <Card className="w-full max-w-md bg-card">
        <CardHeader className="text-center space-y-2">
          <CardTitle className="text-3xl font-mono font-bold tracking-tight text-primary">abstrabit</CardTitle>
          <CardDescription className="font-mono text-xs uppercase tracking-wider text-muted-foreground">Automate your GitHub workflows</CardDescription>
        </CardHeader>
        <CardContent className="flex justify-center mt-4">
          <Button 
            onClick={handleLogin} 
            disabled={isRedirecting}
            className="w-full font-mono text-sm tracking-wide uppercase" 
            size="lg"
          >
            {isRedirecting ? (
              <Loader2 className="mr-2 h-5 w-5 animate-spin" />
            ) : (
              <GitBranch className="mr-2 h-5 w-5" />
            )}
            {isRedirecting ? 'Redirecting...' : 'Login with GitHub'}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};
