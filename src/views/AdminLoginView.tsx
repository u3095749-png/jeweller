import React, { useEffect, useState } from 'react';
import {
  AlertCircle,
  ArrowLeft,
  Eye,
  EyeOff,
  Lock,
  ShieldCheck,
} from 'lucide-react';
import { useStore } from '../context/StoreContext';
import { STORE_CONFIG } from '../config/storeConfig';

export function AdminLoginView() {
  const {
    navigate,
    adminSession,
    adminSessionChecked,
    refreshAdminSession,
    showToast,
  } = useStore();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const redirectTimerRef = React.useRef<number | null>(null);

  useEffect(() => {
    void refreshAdminSession();
    return () => {
      if (redirectTimerRef.current !== null) {
        window.clearTimeout(redirectTimerRef.current);
      }
    };
  }, [refreshAdminSession]);

  useEffect(() => {
    if (adminSessionChecked && adminSession.authenticated) {
      navigate({ page: 'admin', section: 'overview' }, { replace: true });
    }
  }, [adminSessionChecked, adminSession.authenticated, navigate]);

  const cancelPendingRedirect = () => {
    if (redirectTimerRef.current !== null) {
      window.clearTimeout(redirectTimerRef.current);
      redirectTimerRef.current = null;
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password || isSubmitting) return;

    cancelPendingRedirect();
    setErrorMsg(null);
    setIsSubmitting(true);

    try {
      const endpoint = adminSession.setupRequired ? '/api/admin/setup' : '/api/admin/login';
      const res = await fetch(endpoint, {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          'X-Requested-With': 'XMLHttpRequest',
        },
        body: JSON.stringify({ email: email.trim(), password }),
      });

      if (res.status === 404) {
        setErrorMsg(
          'Admin authentication API returned HTTP 404 (backend route not found). Ensure the Express backend is running locally (`npm run dev`), or redeploy Vercel with `api/index.ts` and `vercel.json`.'
        );
        return;
      }

      const contentType = res.headers.get('content-type') || '';
      if (!contentType.includes('application/json')) {
        setErrorMsg(
          `Authentication server returned an unexpected response (HTTP ${res.status}). Please verify the backend API server is running.`
        );
        return;
      }

      const data = (await res.json()) as {
        ok?: boolean;
        error?: string;
        setupRequired?: boolean;
      };

      if (res.status >= 500) {
        setErrorMsg(
          data.error || `Authentication server error (HTTP ${res.status}). Please try again.`
        );
        return;
      }

      if (!res.ok || !data.ok) {
        if (data.setupRequired) {
          setErrorMsg(data.error || 'Initial administrator setup is required.');
          void refreshAdminSession();
          return;
        }
        if (res.status === 429 || res.status === 403 || res.status === 400) {
          setErrorMsg(data.error || 'Request could not be completed. Please try again.');
          return;
        }

        const message =
          data.error || 'Invalid administrator email or password.';
        setErrorMsg(
          !adminSession.setupRequired
            ? `${message} Returning to storefront shortly, or edit below to retry.`
            : message
        );
        setPassword('');
        if (!adminSession.setupRequired) {
          showToast(message);
          redirectTimerRef.current = window.setTimeout(() => {
            navigate({ page: 'home' }, { replace: true });
          }, 3500);
        }
        return;
      }

      setPassword('');
      const verifiedSession = await refreshAdminSession();
      if (!verifiedSession.authenticated) {
        setErrorMsg(
          'Login succeeded, but your browser blocked the session cookie inside the embedded preview. Allow cookies or open the app URL directly in a new tab.'
        );
        return;
      }

      showToast('Administrator access verified.');
      navigate({ page: 'admin', section: 'overview' }, { replace: true });
    } catch {
      setErrorMsg('Unable to reach authentication server. Please check your connection and try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!adminSessionChecked) {
    return (
      <div className="min-h-screen bg-[#F8F5EF] flex items-center justify-center p-4">
        <div className="text-xs uppercase tracking-[0.18em] text-[#252525]/60">
          Verifying Session...
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F8F5EF] text-[#252525] flex flex-col justify-between p-4 sm:p-8">
      <div className="max-w-md w-full mx-auto">
        <button
          type="button"
          onClick={() => navigate({ page: 'home' })}
          className="inline-flex items-center gap-2 text-xs font-medium text-[#252525]/70 hover:text-[#252525] transition-colors cursor-pointer"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to {STORE_CONFIG.brandName}</span>
        </button>
      </div>

      <div className="max-w-md w-full mx-auto bg-[#FFFDF8] border border-[#252525]/12 shadow-sm p-6 sm:p-8 space-y-6 my-8">
        <div className="space-y-2 border-b border-[#252525]/10 pb-5">
          <div className="w-11 h-11 bg-[#252525] text-[#C6A15B] flex items-center justify-center">
            {adminSession.setupRequired ? (
              <ShieldCheck className="w-5 h-5" />
            ) : (
              <Lock className="w-5 h-5" />
            )}
          </div>
          <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-[#8E6E30] pt-1">
            Private Maison Administration
          </p>
          <h1 className="font-serif text-3xl font-medium text-[#252525]">
            {adminSession.setupRequired ? 'Configure Admin Access' : 'Administrator Login'}
          </h1>
          <p className="text-xs text-[#252525]/65 leading-relaxed">
            {adminSession.setupRequired
              ? 'Register the private owner account once to manage products, categories, orders, and security alerts.'
              : 'Sign in with authorized administrator credentials to manage products, categories, and orders.'}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label
              htmlFor="admin-email"
              className="block text-xs font-medium text-[#252525] mb-1.5"
            >
              Email Address
            </label>
            <input
              id="admin-email"
              type="email"
              autoComplete="username"
              required
              value={email}
              onChange={(e) => {
                cancelPendingRedirect();
                setEmail(e.target.value);
              }}
              placeholder="owner@zaveriatelier.pk"
              className="w-full px-3.5 py-2.5 min-h-[44px] bg-[#F8F5EF] border border-[#252525]/18 text-sm text-[#252525] placeholder:text-[#252525]/40 focus:outline-none focus:border-[#C6A15B]"
            />
          </div>

          <div>
            <label
              htmlFor="admin-password"
              className="block text-xs font-medium text-[#252525] mb-1.5"
            >
              Password
            </label>
            <div className="relative">
              <input
                id="admin-password"
                type={showPassword ? 'text' : 'password'}
                autoComplete={adminSession.setupRequired ? 'new-password' : 'current-password'}
                required
                minLength={adminSession.setupRequired ? 8 : 1}
                value={password}
                onChange={(e) => {
                  cancelPendingRedirect();
                  setPassword(e.target.value);
                }}
                placeholder={
                  adminSession.setupRequired
                    ? 'Create a strong password (min 8 characters)'
                    : 'Enter administrator password'
                }
                className="w-full pl-3.5 pr-11 py-2.5 min-h-[44px] bg-[#F8F5EF] border border-[#252525]/18 text-sm text-[#252525] placeholder:text-[#252525]/40 focus:outline-none focus:border-[#C6A15B]"
              />
              <button
                type="button"
                onClick={() => setShowPassword((prev) => !prev)}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 w-8 h-8 flex items-center justify-center text-[#252525]/60 hover:text-[#252525] cursor-pointer"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {(errorMsg || adminSession.configError) && (
            <div
              role="alert"
              className="p-3 bg-red-50 border border-red-200 text-xs text-red-800 flex items-start gap-2"
            >
              <AlertCircle className="w-4 h-4 text-red-700 shrink-0 mt-0.5" />
              <span>{errorMsg || adminSession.configError}</span>
            </div>
          )}

          <button
            type="submit"
            disabled={isSubmitting || !email.trim() || !password}
            className="w-full py-3 px-5 min-h-[46px] bg-[#252525] text-[#FFFDF8] text-xs font-medium tracking-wide hover:bg-[#363636] disabled:opacity-50 transition-colors cursor-pointer"
          >
            {isSubmitting
              ? 'Verifying Credentials...'
              : adminSession.setupRequired
              ? 'Create Owner Account'
              : 'Login to Admin Panel'}
          </button>
        </form>

        <div className="pt-3 border-t border-[#252525]/10 text-[11px] text-[#252525]/55 flex items-center justify-between gap-2">
          <span>Protected by HttpOnly session &amp; scrypt</span>
          <span>WhatsApp login alerts active</span>
        </div>
      </div>

      <div className="max-w-md w-full mx-auto text-center text-[11px] text-[#252525]/45">
        {STORE_CONFIG.brandName} · Private Administrative Console
      </div>
    </div>
  );
}
