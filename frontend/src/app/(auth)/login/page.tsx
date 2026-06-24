'use client';

import { useState, FormEvent } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';

export default function LoginPage() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const { login } = useAuth();

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');
    try {
      await login(username, password);
    } catch (err: any) {
      setError(err.response?.data?.error?.detail || 'Invalid username or password. Please try again.');
    }
  }

  return (
    <div className="min-h-screen flex bg-neutral">
      {/* Left Panel: Branding */}
      <div className="hidden lg:flex lg:w-1/2 bg-primary relative items-center justify-center overflow-hidden">
        {/* Subtle decorative background pattern */}
        <div className="absolute inset-0 opacity-10" style={{
          backgroundImage: 'radial-gradient(circle at 2px 2px, white 1px, transparent 0)',
          backgroundSize: '32px 32px'
        }} />
        
        <div className="relative z-10 flex flex-col items-center px-12 text-center text-white">
          <div className="bg-white p-4 rounded-xl mb-8 shadow-2xl ring-4 ring-white/10">
            {/* Fallback to a common high-res IOCL logo URL. User can replace src with /logo.png later */}
            <img 
              src="https://upload.wikimedia.org/wikipedia/en/thumb/f/fa/Indian_Oil_Logo.svg/1200px-Indian_Oil_Logo.svg.png" 
              alt="IndianOil" 
              className="w-32 h-32 object-contain"
            />
          </div>
          <h1 className="text-4xl font-bold tracking-tight mb-4">
            Industrial Integrity System
          </h1>
          <p className="text-lg text-blue-100 max-w-md">
            Advanced calibration tracking and alert management for enterprise instrumentation.
          </p>
        </div>
      </div>

      {/* Right Panel: Login Form */}
      <div className="flex-1 flex flex-col justify-center px-8 sm:px-12 lg:px-24">
        <div className="w-full max-w-md mx-auto">
          {/* Mobile Logo Header */}
          <div className="lg:hidden flex flex-col items-center mb-10">
            <img 
              src="https://upload.wikimedia.org/wikipedia/en/thumb/f/fa/Indian_Oil_Logo.svg/1200px-Indian_Oil_Logo.svg.png" 
              alt="IndianOil" 
              className="w-20 h-20 mb-4"
            />
            <h1 className="text-2xl font-bold text-gray-900 text-center">
              Industrial Integrity System
            </h1>
          </div>

          <div className="mb-10 text-center lg:text-left">
            <h2 className="text-3xl font-bold text-gray-900 mb-2">Welcome Back</h2>
            <p className="text-gray-500">Sign in to access the CalibTrack portal.</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {error && (
              <div className="p-4 bg-red-50 border-l-4 border-red-500 rounded-r-md">
                <p className="text-sm text-red-700 font-medium">{error}</p>
              </div>
            )}

            <div>
              <Input
                label="Username"
                type="text"
                placeholder="Enter your username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
                className="w-full"
              />
            </div>

            <div>
              <Input
                label="Password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="w-full"
              />
            </div>

            <div className="pt-2">
              <Button 
                type="submit" 
                variant="primary" 
                className="w-full py-2.5 text-base shadow-lg shadow-primary/20"
              >
                Sign in to Dashboard
              </Button>
            </div>
            
            <p className="text-center text-sm text-gray-500 mt-6">
              Protected system. Authorized personnel only.
            </p>
          </form>
        </div>
      </div>
    </div>
  );
}
