import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Activity, Eye, EyeOff, Loader2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import toast from 'react-hot-toast';

const Login = () => {
  const [form, setForm] = useState({ username: '', password: '' });
  const [showPw, setShowPw] = useState(false);
  const { login, loading } = useAuth();
  const navigate = useNavigate();

  const submit = async (e) => {
    e.preventDefault();
    const result = await login(form.username, form.password);
    if (result.success) {
      toast.success('Welcome to KINETIX');
      navigate('/');
    } else {
      toast.error(result.error);
    }
  };

  return (
    <div className="min-h-screen bg-dark-900 flex items-center justify-center p-4">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary-600/5 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-primary-800/5 rounded-full blur-3xl" />
      </div>
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md"
      >
        <div className="card p-8">
          <div className="flex flex-col items-center mb-8">
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.2, type: 'spring' }}
              className="w-16 h-16 bg-primary-600 rounded-2xl flex items-center justify-center mb-4 shadow-glow"
            >
              <Activity size={32} className="text-white" />
            </motion.div>
            <h1 className="text-3xl font-bold text-white tracking-wide">KINETIX</h1>
            <p className="text-gray-400 text-sm mt-1">Medical Management System</p>
          </div>

          <form onSubmit={submit} className="space-y-4">
            <div>
              <label className="text-xs text-gray-400 mb-1.5 block font-medium">Username</label>
              <input
                className="input"
                placeholder="Enter your username"
                value={form.username}
                onChange={e => setForm(f => ({ ...f, username: e.target.value }))}
                required
                autoFocus
              />
            </div>
            <div>
              <label className="text-xs text-gray-400 mb-1.5 block font-medium">Password</label>
              <div className="relative">
                <input
                  className="input pr-10"
                  type={showPw ? 'text' : 'password'}
                  placeholder="Enter your password"
                  value={form.password}
                  onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
                  required
                />
                <button type="button" onClick={() => setShowPw(!showPw)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white transition-colors">
                  {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>
            <motion.button
              type="submit"
              disabled={loading}
              whileHover={{ scale: 1.01 }}
              whileTap={{ scale: 0.99 }}
              className="w-full bg-primary-600 hover:bg-primary-700 disabled:opacity-50 text-white py-2.5 rounded-lg font-medium transition-colors flex items-center justify-center gap-2 mt-2"
            >
              {loading ? <><Loader2 size={18} className="animate-spin" /> Signing in...</> : 'Sign In'}
            </motion.button>
          </form>

          <div className="mt-6 p-3 bg-dark-700/50 rounded-lg">
            <p className="text-xs text-gray-400 text-center mb-2">Demo Credentials</p>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="p-2 bg-dark-700 rounded text-center">
                <p className="text-primary-400 font-medium">Admin</p>
                <p className="text-gray-400">admin / admin123</p>
              </div>
              <div className="p-2 bg-dark-700 rounded text-center">
                <p className="text-emerald-400 font-medium">Doctor</p>
                <p className="text-gray-400">dr.smith / doctor123</p>
              </div>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

export default Login;
