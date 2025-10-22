'use client';
import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useRouter } from 'next/navigation';

export default function AuthPage() {
  const { user, loading, error, signIn } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const router = useRouter();

  useEffect(() => {
    if (!loading && user) {
      router.push('/');
    }
  }, [user, loading, router]);

  const handleSubmit = async () => {
    if (!email.trim() || !password.trim()) return;
    
    setIsSubmitting(true);
    
    try {
      const { error } = await signIn(email, password);
      if (!error) {
        router.push('/');
      }
    } catch (err) {
      console.error('Auth error:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        {/* Clean background while loading */}
      </div>
    );
  }

  if (user) {
    return null;
  }

  return (
    <div className="fixed inset-0 flex items-center justify-center p-3 sm:p-4 bg-gradient-to-br from-background to-muted/20">
      <Card className="w-full max-w-md z-10">
        <CardHeader className="space-y-1 px-4 sm:px-6 py-5 sm:py-6">
          <CardTitle className="text-xl sm:text-2xl font-bold bg-gradient-to-r from-primary via-primary to-primary/80 bg-clip-text text-transparent">
            Welcome to JJK.AI
          </CardTitle>
          <CardDescription className="text-sm">
            Sign in to continue
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 px-4 sm:px-6 pb-5 sm:pb-6">
          {error && (
            <div className="p-3 rounded-md bg-destructive/10 border border-destructive/20 text-destructive text-sm">
              {error}
            </div>
          )}
          <div className="space-y-3">
            <Input
              type="email"
              placeholder="your@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && password) {
                  handleSubmit();
                }
              }}
              disabled={isSubmitting}
              className="h-11 sm:h-10 text-base"
            />
            <Input
              type="password"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  handleSubmit();
                }
              }}
              disabled={isSubmitting}
              className="h-11 sm:h-10 text-base"
            />
          </div>
          <Button 
            onClick={handleSubmit} 
            disabled={isSubmitting || !email.trim() || !password.trim()}
            className="w-full h-11 sm:h-10 text-base sm:text-sm"
          >
            {isSubmitting ? 'Signing in...' : 'Sign In'}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
