import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { MessageSquare, Eye, EyeOff, AlertCircle, Loader2, CheckCircle2, X } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { registerSchema, RegisterInput } from '@/validations/auth.validation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';

const getStrength = (pw: string) => {
  if (!pw) return { level: 0, label: '', color: '' };
  if (pw.length < 6)  return { level: 1, label: 'Weak',   color: 'bg-destructive' };
  if (pw.length < 10) return { level: 2, label: 'Good',   color: 'bg-amber-500' };
  return               { level: 3, label: 'Strong', color: 'bg-emerald-500' };
};

const Signup: React.FC = () => {
  const { register } = useAuth();
  const navigate = useNavigate();

  const [form, setForm]               = useState<RegisterInput>({ username: '', email: '', password: '' });
  const [fieldErrors, setFieldErrors] = useState<Partial<Record<keyof RegisterInput, string>>>({});
  const [apiError, setApiError]       = useState('');
  const [showPw, setShowPw]           = useState(false);
  const [loading, setLoading]         = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setForm((p) => ({ ...p, [name]: value }));
    // Only clear per-field error — DO NOT clear apiError here
    setFieldErrors((p) => ({ ...p, [name]: undefined }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setApiError(''); // clear on new submit attempt

    const result = registerSchema.safeParse(form);
    if (!result.success) {
      const errors: typeof fieldErrors = {};
      result.error.errors.forEach((err) => {
        const field = err.path[0] as keyof RegisterInput;
        if (!errors[field]) errors[field] = err.message;
      });
      setFieldErrors(errors);
      return;
    }

    setLoading(true);
    try {
      await register(result.data);
      navigate('/chat');
    } catch (err: unknown) {
      const axiosErr = err as { response?: { data?: { message?: string } }; message?: string };
      // Show backend message if available, otherwise show the raw error
      const msg = axiosErr.response?.data?.message ?? axiosErr.message ?? 'Registration failed';
      setApiError(msg);
    } finally {
      setLoading(false);
    }
  };

  const pw = getStrength(form.password);

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 w-96 h-96 bg-primary/5 rounded-full blur-3xl" />
      </div>

      <div className="relative w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center h-14 w-14 rounded-2xl bg-primary shadow-lg shadow-primary/25 mb-4">
            <MessageSquare size={24} className="text-primary-foreground" />
          </div>
          <h1 className="text-2xl font-bold text-foreground">Create account</h1>
          <p className="text-muted-foreground text-sm mt-1">Join Pulse and start chatting</p>
        </div>

        <div className="bg-card border border-border rounded-2xl p-6 shadow-xl shadow-black/20">

          {/* API error — stays until next submit or manual close */}
          {apiError && (
            <div className="flex items-start gap-2 bg-destructive/10 border border-destructive/20 rounded-lg px-3 py-2.5 mb-5">
              <AlertCircle size={14} className="text-destructive flex-shrink-0 mt-0.5" />
              <p className="text-sm text-destructive flex-1">{apiError}</p>
              <button title='Close' type="button" onClick={() => setApiError('')}
                className="text-destructive/60 hover:text-destructive transition-colors flex-shrink-0">
                <X size={14} />
              </button>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4" noValidate>
            <div className="space-y-1.5">
              <Label htmlFor="username">Username</Label>
              <Input
                id="username" name="username"
                value={form.username} onChange={handleChange}
                placeholder="cooluser123"
                className={fieldErrors.username ? 'border-destructive' : ''}
              />
              {fieldErrors.username && <p className="text-xs text-destructive">{fieldErrors.username}</p>}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="email">Email</Label>
              <div className="relative">
                <Input
                  id="email" name="email" type="email"
                  value={form.email} onChange={handleChange}
                  placeholder="you@example.com"
                  className={cn('pr-9', fieldErrors.email ? 'border-destructive' : '')}
                />
                {form.email.includes('@') && !fieldErrors.email && (
                  <CheckCircle2 size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-emerald-500" />
                )}
              </div>
              {fieldErrors.email && <p className="text-xs text-destructive">{fieldErrors.email}</p>}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="password">Password</Label>
              <div className="relative">
                <Input
                  id="password" name="password"
                  type={showPw ? 'text' : 'password'}
                  value={form.password} onChange={handleChange}
                  placeholder="••••••••"
                  className={cn('pr-10', fieldErrors.password ? 'border-destructive' : '')}
                />
                <button type="button" onClick={() => setShowPw((p) => !p)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors">
                  {showPw ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
              {fieldErrors.password && <p className="text-xs text-destructive">{fieldErrors.password}</p>}
              {form.password && !fieldErrors.password && (
                <div className="flex items-center gap-2 mt-1">
                  <div className="flex gap-1 flex-1">
                    {[1, 2, 3].map((l) => (
                      <div key={l} className={cn('h-1 flex-1 rounded-full transition-all', pw.level >= l ? pw.color : 'bg-muted')} />
                    ))}
                  </div>
                  <span className={cn('text-[10px] font-semibold',
                    pw.level === 1 ? 'text-destructive' : pw.level === 2 ? 'text-amber-500' : 'text-emerald-500')}>
                    {pw.label}
                  </span>
                </div>
              )}
            </div>

            <Button type="submit" disabled={loading} className="w-full mt-2">
              {loading && <Loader2 size={15} className="mr-2 animate-spin" />}
              {loading ? 'Creating account…' : 'Create account'}
            </Button>
          </form>

          <p className="text-center text-sm text-muted-foreground mt-5">
            Already have an account?{' '}
            <Link to="/login" className="text-primary hover:text-primary/80 font-semibold transition-colors">
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default Signup;