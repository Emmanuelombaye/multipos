import { useState, useEffect } from 'react';
import { Loader } from 'lucide-react';
import { Button } from './ui/button';
import { Card } from './ui/card';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { useAuth } from '../api/auth';
import { apiClient } from '../api/client';

interface LoginScreenProps {
  onLogin: (role: 'admin' | 'manager' | 'cashier', branchId: string) => void;
}

export function LoginScreen({ onLogin }: LoginScreenProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [selectedRole, setSelectedRole] = useState<'admin' | 'manager' | 'cashier'>('cashier');
  const [branches, setBranches] = useState<any[]>([]);
  const [selectedBranch, setSelectedBranch] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const { login } = useAuth();

  useEffect(() => {
    loadBranches();
  }, []);

  const loadBranches = async () => {
    try {
      const data = await apiClient.getBranches();
      const branchesArray = Array.isArray(data) ? data : [];
      setBranches(branchesArray);
      if (branchesArray.length > 0 && !selectedBranch) {
        setSelectedBranch(branchesArray[0].id);
      }
    } catch (error) {
      console.error('Failed to load branches:', error);
      setBranches([]);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      await login(email, password);
      // Get user from localStorage after login
      const userStr = localStorage.getItem('user');
      if (userStr) {
        const user = JSON.parse(userStr);
        let branchId = user.branchId || selectedBranch || 'branch-1';
        const role = user.role || selectedRole;
        // Persist branch selection for cashiers
        if (role === 'cashier') {
          localStorage.setItem('selectedBranch', branchId);
        }
        onLogin(role, branchId);
      }
    } catch (err: any) {
      setError(err.response?.data?.error || 'Login failed');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-neutral-900 via-neutral-800 to-red-950 p-4">
      <Card className="w-full max-w-md p-8 bg-white shadow-2xl">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center mb-4">
            <img src="/edendroplogo.png" alt="EdenDropInvestment Logo" className="w-24 h-24 object-contain" />
          </div>
          <h1 className="text-3xl font-bold text-neutral-900 mb-2">EdenDropInvestment</h1>
          <p className="text-neutral-600">Multi-Branch Management System</p>
        </div>

        <form onSubmit={handleLogin} className="space-y-6">
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
              {error}
            </div>
          )}

          <div>
            <Label htmlFor="email" className="block text-sm font-medium text-neutral-700 mb-2">
              Email Address
            </Label>
            <Input
              id="email"
              type="email"
              placeholder="john@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={isLoading}
              required
              className="w-full"
            />
          </div>

          <div>
            <Label htmlFor="password" className="block text-sm font-medium text-neutral-700 mb-2">
              Password
            </Label>
            <Input
              id="password"
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={isLoading}
              required
              className="w-full"
            />
          </div>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label className="block text-sm font-medium text-neutral-700">Role</Label>
              <div className="grid grid-cols-3 gap-2">
                {(['admin', 'manager', 'cashier'] as const).map((role) => (
                  <Button
                    key={role}
                    type="button"
                    variant={selectedRole === role ? 'default' : 'outline'}
                    onClick={() => setSelectedRole(role)}
                    className={selectedRole === role ? 'bg-red-700 hover:bg-red-800 text-white' : ''}
                    disabled={isLoading}
                  >
                    {role.charAt(0).toUpperCase() + role.slice(1)}
                  </Button>
                ))}
              </div>
            </div>

            {selectedRole === 'cashier' && (
              <div className="space-y-2">
                <Label className="block text-sm font-medium text-neutral-700">Branch</Label>
                <Select value={selectedBranch} onValueChange={setSelectedBranch} disabled={isLoading}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select branch" />
                  </SelectTrigger>
                  <SelectContent>
                    {branches.map((branch) => (
                      <SelectItem key={branch.id} value={branch.id}>
                        {branch.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>

          <Button
            type="submit"
            disabled={isLoading}
            className="w-full bg-red-700 hover:bg-red-800 text-white h-12 text-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {isLoading && <Loader className="w-4 h-4 animate-spin" />}
            {isLoading ? 'Logging in...' : 'Login'}
          </Button>
        </form>

      </Card>
    </div>
  );
}
