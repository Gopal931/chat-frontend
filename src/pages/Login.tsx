import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { MessageSquare, Eye, EyeOff, AlertCircle, Loader2, X } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { loginSchema, LoginInput } from '@/validations/auth.validation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

const Login: React.FC = () => {
  const { login } = useAuth();
  const navigate = useNavigate();

  const [form, setForm]= useState<LoginInput>({ email: '', password: '' });
  const [fieldErrors, setFieldErrors] = useState<Partial<LoginInput>>({});
  const [apiError, setApiError]= useState('');
  const [showPw, setShowPw]= useState(false);
  const [loading, setLoading]= useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setForm((p) => ({ ...p, [name]: value }));
    
    // Only clear the per-field Zod error for THIS field as user types
    // DO NOT clear apiError here — it must stay visible until next submit
    setFieldErrors((p) => ({ ...p, [name]: undefined }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Clear previous API error on new submit attempt
    setApiError('');

    // Client-side Zod validation
    const result = loginSchema.safeParse(form);
    if (!result.success) {
      const errors: Partial<LoginInput> = {};
      result.error.errors.forEach((err) => {
        const field = err.path[0] as keyof LoginInput;
        errors[field] = err.message;
      });
      setFieldErrors(errors);
      return;
    }

    setLoading(true);
    try {
      await login(result.data);
      navigate('/chat');
    } catch (err: unknown) {
      const axiosErr = err as { response?: { data?: { message?: string } }; message?: string };
      const msg = axiosErr.response?.data?.message ?? axiosErr.message ?? 'Invalid email or password';
      setApiError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-96 h-96 bg-primary/5 rounded-full blur-3xl" />
      </div>

      <div className="relative w-full max-w-sm">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center h-14 w-14 rounded-2xl bg-primary shadow-lg shadow-primary/25 mb-4">
            <MessageSquare size={24} className="text-primary-foreground" />
          </div>
          <h1 className="text-2xl font-bold text-foreground">Welcome back</h1>
          <p className="text-muted-foreground text-sm mt-1">Sign in to your Pulse account</p>
        </div>

        <div className="bg-card border border-border rounded-2xl p-6 shadow-xl shadow-black/20">

          {/* API error banner — stays until user submits again or manually closes */}
          {apiError && (
            <div className="flex items-start gap-2 bg-destructive/10 border border-destructive/20 rounded-lg px-3 py-2.5 mb-5">
              <AlertCircle size={14} className="text-destructive flex-shrink-0 mt-0.5" />
              <p className="text-sm text-destructive flex-1">{apiError}</p>
              <button
                title='c'
                type="button"
                onClick={() => setApiError('')}
                className="text-destructive/60 hover:text-destructive transition-colors flex-shrink-0"
              >
                <X size={14} />
              </button>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4" noValidate>
            <div className="space-y-1.5">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email" name="email" type="email"
                value={form.email} onChange={handleChange}
                placeholder="you@example.com"
                className={fieldErrors.email ? 'border-destructive' : ''}
              />
              {fieldErrors.email && (
                <p className="text-xs text-destructive mt-1">{fieldErrors.email}</p>
              )}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="password">Password</Label>
              <div className="relative">
                <Input
                  id="password" name="password"
                  type={showPw ? 'text' : 'password'}
                  value={form.password} onChange={handleChange}
                  placeholder="••••••••"
                  className={`pr-10 ${fieldErrors.password ? 'border-destructive' : ''}`}
                />
                <button
                  type="button"
                  onClick={() => setShowPw((p) => !p)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                >
                  {showPw ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
              {fieldErrors.password && (
                <p className="text-xs text-destructive mt-1">{fieldErrors.password}</p>
              )}
            </div>

            <Button type="submit" disabled={loading} className="w-full mt-2">
              {loading && <Loader2 size={15} className="mr-2 animate-spin" />}
              {loading ? 'Signing in…' : 'Sign in'}
            </Button>
          </form>

          <p className="text-center text-sm text-muted-foreground mt-5">
            Don't have an account?{' '}
            <Link to="/signup" className="text-primary hover:text-primary/80 font-semibold transition-colors">
              Sign up
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default Login;