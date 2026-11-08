import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { Button } from '../common/Button';
import { Input } from '../common/Input';
import { Lock, Mail, ShieldAlert, KeyRound } from 'lucide-react';

interface LoginFormProps {
  onSuccess?: () => void;
}

export const LoginForm: React.FC<LoginFormProps> = ({ onSuccess }) => {
  const { login, resetPassword } = useAuth();
  const { success, error } = useToast();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [forgotPasswordOpen, setForgotPasswordOpen] = useState(false);
  const [resetEmail, setResetEmail] = useState('');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      error('Credentials Required', 'Please enter your corporate email and password.');
      return;
    }

    setLoading(true);
    try {
      await login(email.trim(), password);
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
      await resetPassword(resetEmail.trim());
      success('Password Reset Email Sent', 'Check your inbox for password reset instructions.');
      setForgotPasswordOpen(false);
    } catch (err: any) {
      error('Reset Failed', err.message);
    }
  };

  const fillMasterCredentials = () => {
    setEmail('admin@skolar.it');
    setPassword('skolar2026');
  };

  return (
    <div className="min-h-screen bg-[#F4F5F8] flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-white rounded-3xl border border-slate-200/90 shadow-elevated p-8 space-y-6">
        {/* Brand Header */}
        <div className="text-center space-y-2">
          <div className="w-12 h-12 rounded-2xl bg-midnight text-gold-400 font-serif font-bold text-xl flex items-center justify-center mx-auto shadow-md">
            S
          </div>
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
            autoFocus
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
            <button
              type="button"
              onClick={fillMasterCredentials}
              className="text-slate-500 hover:text-navy-900 flex items-center gap-1 font-medium transition-colors"
            >
              <KeyRound className="w-3.5 h-3.5 text-gold-600" />
              <span>Use Master Credentials</span>
            </button>
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
