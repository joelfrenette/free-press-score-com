'use client'

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { loginAdmin } from '@/lib/admin-actions';
import { LogIn } from 'lucide-react';

export default function AdminLoginPage() {
  const router = useRouter();
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    const success = await loginAdmin(password);
    
    if (success) {
      router.push('/admin');
    } else {
      setError('Invalid password');
    }
    
    setLoading(false);
  };

  return (
    <main className="flex min-h-screen items-center justify-center bg-background">
      <Card className="w-full max-w-md p-8">
        <h1 className="mb-6 text-center text-2xl font-bold">Admin Login</h1>
        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter admin password"
            />
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
          <Button type="submit" className="w-full gap-2" disabled={loading}>
            <LogIn className="h-4 w-4" />
            {loading ? 'Logging in...' : 'Login'}
          </Button>
        </form>
      </Card>
    </main>
  );
}
