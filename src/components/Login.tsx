/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { User, UserRole } from '../types';
import { Shield, Eye, EyeOff, Mail, Lock, User as UserIcon, Phone, BookOpen, Fingerprint, RefreshCw } from 'lucide-react';

interface LoginProps {
  onLoginSuccess: (user: User, token: string) => void;
  showToast: (msg: string, type: 'success' | 'error' | 'info') => void;
}

export const Login: React.FC<LoginProps> = ({ onLoginSuccess, showToast }) => {
  const [isRegistering, setIsRegistering] = useState(false);
  const [isForgotPassword, setIsForgotPassword] = useState(false);
  const [isResetting, setIsResetting] = useState(false);

  // Form Fields
  const [role, setRole] = useState<UserRole>('student');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [name, setName] = useState('');
  const [mobile, setMobile] = useState('');
  const [institution, setInstitution] = useState('Indore Institute of Science & Tech');
  const [idNumber, setIdNumber] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);

  // Forgot / Reset Fields
  const [resetToken, setResetToken] = useState('');
  const [newPassword, setNewPassword] = useState('');

  // Password Strength Criteria Checks
  const validateEmail = (mail: string) => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(mail);
  };

  const isPasswordValid = (pass: string) => {
    return pass.length >= 8 && /[A-Z]/.test(pass) && /[0-9]/.test(pass);
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      showToast('Please enter both email and password.', 'error');
      return;
    }
    if (!validateEmail(email)) {
      showToast('Please enter a valid email address.', 'error');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, role }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Login failed');
      }

      showToast(`Welcome back, ${data.user.name}!`, 'success');
      if (rememberMe) {
        localStorage.setItem('remembered_email', email);
        localStorage.setItem('remembered_role', role);
      } else {
        localStorage.removeItem('remembered_email');
        localStorage.removeItem('remembered_role');
      }
      onLoginSuccess(data.user, data.token);
    } catch (err: any) {
      showToast(err.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !email || !mobile || !password || !confirmPassword || !institution || !idNumber) {
      showToast('All fields are strictly required for registration.', 'error');
      return;
    }
    if (!validateEmail(email)) {
      showToast('Please specify a valid email address.', 'error');
      return;
    }
    if (password !== confirmPassword) {
      showToast('Passwords do not match.', 'error');
      return;
    }
    if (!isPasswordValid(password)) {
      showToast('Password must be at least 8 characters long, contain 1 uppercase letter, and 1 number.', 'error');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          email,
          mobile,
          password,
          role,
          institution,
          studentTeacherId: idNumber,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Registration failed');
      }

      showToast('Account created successfully! Please log in.', 'success');
      setIsRegistering(false);
      setPassword('');
      setConfirmPassword('');
    } catch (err: any) {
      showToast(err.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) {
      showToast('Email address is required.', 'error');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error);
      }

      showToast('Password reset token generated. Proceeding to reset password.', 'success');
      setResetToken(data.token);
      setIsForgotPassword(false);
      setIsResetting(true);
    } catch (err: any) {
      showToast(err.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPassword) {
      showToast('Please specify a new password.', 'error');
      return;
    }
    if (!isPasswordValid(newPassword)) {
      showToast('Password must be 8+ characters, with 1 uppercase letter and 1 number.', 'error');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: resetToken, password: newPassword }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error);
      }

      showToast('Password successfully updated! Please login again.', 'success');
      setIsResetting(false);
      setNewPassword('');
    } catch (err: any) {
      showToast(err.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center px-4 py-12 sm:px-6 lg:px-8 bg-slate-50 dark:bg-slate-950 text-slate-950 dark:text-slate-50 transition-colors duration-300">
      <div className="w-full max-w-md space-y-8 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xl p-8 transition-colors duration-300 relative overflow-hidden">
        {/* Background Ambient Accents */}
        <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-blue-600 via-indigo-500 to-violet-600" />
        
        <div className="text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-blue-100 dark:bg-blue-950 text-blue-600 dark:text-blue-400">
            <Shield className="h-6 w-6 animate-pulse" />
          </div>
          <h2 className="mt-6 text-3xl font-bold tracking-tight text-slate-900 dark:text-white">
            {isRegistering
              ? 'Create New Account'
              : isForgotPassword
              ? 'Reset Your Password'
              : isResetting
              ? 'Enter New Password'
              : 'Veritas Proctor'}
          </h2>
          <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
            {isRegistering
              ? 'Enroll yourself as a student or faculty member'
              : isForgotPassword
              ? 'We will generate an instant sandbox recovery token'
              : isResetting
              ? 'Verify your cryptographic token to save new password'
              : 'AI-Powered Examination & Proctored Shield'}
          </p>
        </div>

        {/* ROLE SELECTOR (Not displayed during reset phase) */}
        {!isRegistering && !isForgotPassword && !isResetting && (
          <div className="grid grid-cols-4 gap-1 p-1 bg-slate-100 dark:bg-slate-800 rounded-xl">
            {(['student', 'teacher', 'admin', 'developer'] as UserRole[]).map(r => (
              <button
                key={r}
                type="button"
                onClick={() => setRole(r)}
                className={`text-xs font-semibold py-2 rounded-lg capitalize transition-all duration-200 ${
                  role === r
                    ? 'bg-white dark:bg-slate-700 text-blue-600 dark:text-white shadow-sm'
                    : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
                }`}
              >
                {r === 'developer' ? 'Dev' : r}
              </button>
            ))}
          </div>
        )}

        {/* FORGOT PASSWORD SCREEN */}
        {isForgotPassword && (
          <form className="mt-8 space-y-6 animate-fadeIn" onSubmit={handleForgotPassword}>
            <div>
              <label htmlFor="forgot-email" className="block text-sm font-medium text-slate-700 dark:text-slate-300">
                Email address
              </label>
              <div className="relative mt-1">
                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400">
                  <Mail className="h-5 w-5" />
                </div>
                <input
                  id="forgot-email"
                  type="email"
                  required
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  className="block w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 pl-10 pr-3 py-2.5 text-sm placeholder-slate-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-500"
                  placeholder="Enter your registered email"
                />
              </div>
            </div>

            <div className="flex items-center justify-between">
              <button
                type="button"
                onClick={() => setIsForgotPassword(false)}
                className="text-sm font-semibold text-blue-600 dark:text-blue-400 hover:underline"
              >
                Back to login
              </button>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="group relative flex w-full justify-center rounded-xl bg-blue-600 hover:bg-blue-700 py-3 text-sm font-semibold text-white shadow-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {loading ? <RefreshCw className="h-5 w-5 animate-spin" /> : 'Generate Reset Link'}
            </button>
          </form>
        )}

        {/* CRYPTOGRAPHIC RESET SCREEN */}
        {isResetting && (
          <form className="mt-8 space-y-6" onSubmit={handleResetPassword}>
            <div className="bg-blue-50 dark:bg-blue-950 p-4 rounded-xl border border-blue-200 dark:border-blue-900 text-xs">
              <p className="font-semibold text-blue-800 dark:text-blue-300">Instant Sandbox Reset Token:</p>
              <p className="font-mono mt-1 text-slate-600 dark:text-slate-400 break-all bg-white dark:bg-slate-900 p-2 rounded border border-slate-200 dark:border-slate-800 select-all">
                {resetToken}
              </p>
            </div>

            <div>
              <label htmlFor="token-input" className="block text-sm font-medium text-slate-700 dark:text-slate-300">
                Reset Token
              </label>
              <div className="relative mt-1">
                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400">
                  <Fingerprint className="h-5 w-5" />
                </div>
                <input
                  id="token-input"
                  type="text"
                  required
                  value={resetToken}
                  onChange={e => setResetToken(e.target.value)}
                  className="block w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 pl-10 pr-3 py-2.5 text-sm placeholder-slate-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-500"
                  placeholder="Paste token here"
                />
              </div>
            </div>

            <div>
              <label htmlFor="new-password" className="block text-sm font-medium text-slate-700 dark:text-slate-300">
                New Password
              </label>
              <div className="relative mt-1">
                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400">
                  <Lock className="h-5 w-5" />
                </div>
                <input
                  id="new-password"
                  type={showPass ? 'text' : 'password'}
                  required
                  value={newPassword}
                  onChange={e => setNewPassword(e.target.value)}
                  className="block w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 pl-10 pr-10 py-2.5 text-sm placeholder-slate-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-500"
                  placeholder="At least 8 chars, 1 capital, 1 number"
                />
                <button
                  type="button"
                  onClick={() => setShowPass(!showPass)}
                  className="absolute inset-y-0 right-0 flex items-center pr-3 text-slate-400 hover:text-slate-600"
                >
                  {showPass ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="group relative flex w-full justify-center rounded-xl bg-blue-600 hover:bg-blue-700 py-3 text-sm font-semibold text-white shadow-md focus:outline-none"
            >
              {loading ? <RefreshCw className="h-5 w-5 animate-spin" /> : 'Confirm New Password'}
            </button>
          </form>
        )}

        {/* LOGIN FORM SCREEN */}
        {!isRegistering && !isForgotPassword && !isResetting && (
          <form className="mt-8 space-y-6" onSubmit={handleLogin}>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">Email Address</label>
                <div className="relative mt-1">
                  <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400">
                    <Mail className="h-5 w-5" />
                  </div>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    className="block w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 pl-10 pr-3 py-2.5 text-sm placeholder-slate-400 focus:border-blue-500 focus:ring-2"
                    placeholder={
                      role === 'developer' ? 'devop21@gmail.com' : 'Enter email address'
                    }
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">Password</label>
                <div className="relative mt-1">
                  <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400">
                    <Lock className="h-5 w-5" />
                  </div>
                  <input
                    type={showPass ? 'text' : 'password'}
                    required
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    className="block w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 pl-10 pr-10 py-2.5 text-sm placeholder-slate-400 focus:border-blue-500 focus:ring-2"
                    placeholder={role === 'developer' ? 'devop21' : 'Enter password'}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPass(!showPass)}
                    className="absolute inset-y-0 right-0 flex items-center pr-3 text-slate-400 hover:text-slate-600"
                  >
                    {showPass ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                  </button>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <input
                  id="remember-me"
                  type="checkbox"
                  checked={rememberMe}
                  onChange={e => setRememberMe(e.target.checked)}
                  className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                />
                <label htmlFor="remember-me" className="ml-2 block text-xs text-slate-600 dark:text-slate-400">
                  Remember Me
                </label>
              </div>

              <button
                type="button"
                onClick={() => setIsForgotPassword(true)}
                className="text-xs font-semibold text-blue-600 dark:text-blue-400 hover:underline"
              >
                Forgot Password?
              </button>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="group relative flex w-full justify-center rounded-xl bg-blue-600 hover:bg-blue-700 py-3 text-sm font-semibold text-white shadow-md focus:outline-none transition-colors duration-200"
            >
              {loading ? <RefreshCw className="h-5 w-5 animate-spin" /> : 'Log In Securely'}
            </button>

            {role !== 'admin' && role !== 'developer' && (
              <div className="text-center">
                <span className="text-xs text-slate-500 dark:text-slate-400">Don't have an account? </span>
                <button
                  type="button"
                  onClick={() => {
                    setIsRegistering(true);
                    setPassword('');
                  }}
                  className="text-xs font-semibold text-blue-600 dark:text-blue-400 hover:underline"
                >
                  Create New Account
                </button>
              </div>
            )}
          </form>
        )}

        {/* REGISTRATION FORM SCREEN */}
        {isRegistering && (
          <form className="mt-8 space-y-4 max-h-[480px] overflow-y-auto pr-2" onSubmit={handleRegister}>
            <div className="grid grid-cols-2 gap-2 p-1 bg-slate-100 dark:bg-slate-800 rounded-lg">
              {(['student', 'teacher'] as UserRole[]).map(r => (
                <button
                  key={r}
                  type="button"
                  onClick={() => setRole(r)}
                  className={`text-xs font-bold py-1.5 rounded-md capitalize transition-colors ${
                    role === r
                      ? 'bg-white dark:bg-slate-600 text-blue-600 dark:text-white shadow-sm'
                      : 'text-slate-500'
                  }`}
                >
                  {r}
                </button>
              ))}
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300">Full Name</label>
                <div className="relative mt-1">
                  <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400">
                    <UserIcon className="h-4 w-4" />
                  </div>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={e => setName(e.target.value)}
                    className="block w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 pl-9 py-2 text-xs placeholder-slate-400 focus:border-blue-500 focus:ring-1"
                    placeholder="E.g. Alan Turing"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300">Email Address</label>
                <div className="relative mt-1">
                  <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400">
                    <Mail className="h-4 w-4" />
                  </div>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    className="block w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 pl-9 py-2 text-xs placeholder-slate-400 focus:border-blue-500"
                    placeholder="yourname@gmail.com"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300">Mobile Number</label>
                <div className="relative mt-1">
                  <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400">
                    <Phone className="h-4 w-4" />
                  </div>
                  <input
                    type="tel"
                    required
                    value={mobile}
                    onChange={e => setMobile(e.target.value)}
                    className="block w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 pl-9 py-2 text-xs"
                    placeholder="+91 XXXXX XXXXX"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300">Institution / University</label>
                <div className="relative mt-1">
                  <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-emerald-500">
                    <BookOpen className="h-4 w-4" />
                  </div>
                  <input
                    type="text"
                    required
                    readOnly
                    value="Indore Institute of Science & Tech"
                    className="block w-full rounded-xl border border-emerald-200 dark:border-emerald-900/30 bg-emerald-50/50 dark:bg-emerald-950/10 pl-9 py-2 text-xs text-emerald-800 dark:text-emerald-300 font-medium cursor-not-allowed animate-pulse"
                  />
                </div>
                <p className="text-[10px] text-emerald-600 dark:text-emerald-400 mt-1 font-medium flex items-center gap-1">
                  <span>🔒 Securely restricted to Indore Institute of Science & Tech (IIST) members.</span>
                </p>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300">
                  {role === 'student' ? 'Student Enrollment ID' : 'Faculty ID Number'}
                </label>
                <div className="relative mt-1">
                  <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400">
                    <Fingerprint className="h-4 w-4" />
                  </div>
                  <input
                    type="text"
                    required
                    value={idNumber}
                    onChange={e => setIdNumber(e.target.value)}
                    className="block w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 pl-9 py-2 text-xs"
                    placeholder={role === 'student' ? 'STU-12345' : 'TCH-98765'}
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300">Password</label>
                <div className="relative mt-1">
                  <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400">
                    <Lock className="h-4 w-4" />
                  </div>
                  <input
                    type={showPass ? 'text' : 'password'}
                    required
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    className="block w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 pl-9 pr-9 py-2 text-xs"
                    placeholder="8+ chars, 1 Capital, 1 Number"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPass(!showPass)}
                    className="absolute inset-y-0 right-0 flex items-center pr-3 text-slate-400 hover:text-slate-600"
                  >
                    {showPass ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300">Confirm Password</label>
                <div className="relative mt-1">
                  <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400">
                    <Lock className="h-4 w-4" />
                  </div>
                  <input
                    type={showPass ? 'text' : 'password'}
                    required
                    value={confirmPassword}
                    onChange={e => setConfirmPassword(e.target.value)}
                    className="block w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 pl-9 py-2 text-xs"
                    placeholder="Repeat password"
                  />
                </div>
              </div>
            </div>

            <div className="flex flex-col gap-2 pt-2">
              <button
                type="submit"
                disabled={loading}
                className="w-full flex justify-center rounded-xl bg-blue-600 hover:bg-blue-700 py-2.5 text-xs font-semibold text-white shadow-md focus:outline-none"
              >
                {loading ? <RefreshCw className="h-4 w-4 animate-spin" /> : 'Register New Account'}
              </button>

              <button
                type="button"
                onClick={() => setIsRegistering(false)}
                className="text-xs font-semibold text-blue-600 dark:text-blue-400 hover:underline text-center mt-1"
              >
                Already have an account? Log In
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
