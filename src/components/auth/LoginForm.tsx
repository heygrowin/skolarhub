import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { Button } from '../common/Button';
import { Input } from '../common/Input';
import { Lock, Mail, ShieldAlert, Sparkles } from 'lucide-react';

interface LoginFormProps {
  onSuccess?: () => void;
}

export const LoginForm: React.FC<LoginFormProps> = ({ onSuccess }) => {
  const { login, resetPassword, switchSimulatedRole } = useAuth();
  const { success, error, info } = useToast();

  const [email, setEmail] = useState('admin@skolar.it');
  const [password, setPassword] = useState('skolar2026');
  const [loading, setLoading] = useState(false);
  const [forgotPasswordOpen, setForgotPasswordOpen] = useState(false);
  const [resetEmail, setResetEmail] = useState('');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await login(email, password);
      success('Authentication Successful', `Welcome to SKOLAR Control Center.`);
      if (onSuccess) onSuccess();
    } catch (err: any) {
      error('Login Failed', err?.message || 'Invalid credentials or user disabled');
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resetEmail) return;
    try {
      await resetPassword(resetEmail);
      success('Password Reset Email Sent', 'Check your inbox for password reset instructions.');
      setForgotPasswordOpen(false);
    } catch (err: any) {
      error('Reset Failed', err.message);
    }
  };

  const setPresetUser = (role: 'super_admin' | 'counsellor' | 'finance') => {
    switchSimulatedRole(role, role === 'counsellor' ? 'IT' : '*');
    success('Persona Switched', `Logged in as ${role.replace('_', ' ').toUpperCase()} persona.`);
    if (onSuccess) onSuccess();
  };

  return (
    <div className="min-h-screen bg-[#F4F5F8] flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-white rounded-3xl border border-slate-200/90 shadow-elevated p-8 space-y-6">
        {/* Brand Header */}
        <div className="text-center space-y-2">
          <img
            src="/logo-black.png"
            alt="SKOLAR"
            className="h-9 w-auto mx-auto object-contain"
            onError={(e) => {
              (e.target as HTMLElement).style.display = 'none';
            }}
          />
          <div>
            <h1 className="font-serif text-2xl font-bold tracking-tight text-[#101A32]">SKOLAR</h1>
            <p className="text-xs uppercase tracking-widest text-[#C69A4B] font-bold">Control Center</p>
          </div>
          <p className="text-xs text-slate-400">
            Internal operations management platform for global education
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleLogin} className="space-y-4">
          <Input
            label="Corporate Email Address"
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            icon={<Mail className="w-4 h-4" />}
            placeholder="admin@skolar.it"
          />

          <Input
            label="Security Password"
            type="password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            icon={<Lock className="w-4 h-4" />}
            placeholder="••••••••"
          />

          <div className="flex items-center justify-between text-xs">
            <label className="flex items-center gap-1.5 cursor-pointer text-slate-600">
              <input type="checkbox" defaultChecked className="rounded border-slate-300 text-gold-500" />
              <span>Remember station</span>
            </label>
            <button
              type="button"
              onClick={() => setForgotPasswordOpen(true)}
              className="text-gold-600 hover:text-gold-700 font-semibold"
            >
              Forgot password?
            </button>
          </div>

          <Button
            type="submit"
            variant="gold"
            size="md"
            className="w-full"
            loading={loading}
          >
            Sign In to Control Center
          </Button>
        </form>

        {/* Quick Testing Personas Bar */}
        <div className="pt-4 border-t border-slate-100 space-y-2 text-center">
          <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400 flex items-center justify-center gap-1">
            <Sparkles className="w-3 h-3 text-gold-500" />
            Instant Evaluation Personas
          </span>
          <div className="flex justify-center gap-2">
            <button
              type="button"
              onClick={() => setPresetUser('super_admin')}
              className="px-2.5 py-1 text-[11px] font-bold rounded-lg bg-navy-50 text-navy-900 border border-navy-200/60 hover:bg-navy-100"
            >
              👑 Super Admin
            </button>
            <button
              type="button"
              onClick={() => setPresetUser('counsellor')}
              className="px-2.5 py-1 text-[11px] font-bold rounded-lg bg-emerald-50 text-emerald-900 border border-emerald-200/60 hover:bg-emerald-100"
            >
              🎓 Italy Counsellor
            </button>
            <button
              type="button"
              onClick={() => setPresetUser('finance')}
              className="px-2.5 py-1 text-[11px] font-bold rounded-lg bg-amber-50 text-amber-900 border border-amber-200/60 hover:bg-amber-100"
            >
              💰 Finance Officer
            </button>
          </div>
        </div>

        {/* Private Application Notice */}
        <div className="p-3 rounded-2xl bg-slate-50 border border-slate-100 text-center text-[10px] text-slate-400 leading-relaxed">
          <ShieldAlert className="w-3.5 h-3.5 inline mr-1 text-slate-400" />
          Restricted internal system. All access attempts and administrative modifications are audited.
        </div>
      </div>

      {/* Forgot Password Dialog */}
      {forgotPasswordOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-navy-950/60 backdrop-blur-sm">
          <div className="bg-white rounded-3xl p-6 max-w-sm w-full space-y-4 shadow-elevated border border-slate-200">
            <h3 className="text-sm font-bold text-navy-950">Reset Security Credentials</h3>
            <p className="text-xs text-slate-500">
              Enter your corporate email to receive a secure Firebase password reset link.
            </p>
            <form onSubmit={handleResetPassword} className="space-y-3">
              <Input
                label="Email Address"
                type="email"
                required
                value={resetEmail}
                onChange={(e) => setResetEmail(e.target.value)}
                placeholder="counsellor@skolar.it"
              />
              <div className="flex justify-end gap-2 pt-2">
                <Button variant="secondary" size="sm" type="button" onClick={() => setForgotPasswordOpen(false)}>
                  Cancel
                </Button>
                <Button variant="gold" size="sm" type="submit">
                  Send Link
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

