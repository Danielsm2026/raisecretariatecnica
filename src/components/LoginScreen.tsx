import React, { useState } from 'react';
import { 
  Lock, 
  Mail, 
  AlertCircle, 
  Loader2, 
  ShieldCheck, 
  Eye, 
  EyeOff, 
  Trophy,
  ArrowRight
} from 'lucide-react';
import { supabaseSignIn, isSupabaseConfigured } from '../utils/supabaseClient';

interface LoginScreenProps {
  onLoginSuccess: (user: any) => void;
}

export default function LoginScreen({ onLoginSuccess }: LoginScreenProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    const trimmedEmail = email.trim();
    if (!trimmedEmail) {
      setErrorMessage('Por favor, introduce tu correo electrónico.');
      return;
    }

    if (!password) {
      setErrorMessage('Por favor, introduce tu contraseña.');
      return;
    }

    if (!isSupabaseConfigured()) {
      setErrorMessage('Supabase no está configurado. Revisa las credenciales en las variables de entorno.');
      return;
    }

    setLoading(true);

    try {
      const { data, error } = await supabaseSignIn(trimmedEmail, password);

      if (error) {
        throw error;
      }

      if (data?.user) {
        onLoginSuccess(data.user);
      }
    } catch (err: any) {
      console.error('Error durante el inicio de sesión:', err);
      const msg = err.message || '';
      if (msg.includes('Invalid login credentials') || msg.includes('invalid_credentials')) {
        setErrorMessage('Credenciales incorrectas. Comprueba el email y la contraseña.');
      } else if (msg.includes('Email not confirmed')) {
        setErrorMessage('El correo electrónico no ha sido confirmado en Supabase.');
      } else {
        setErrorMessage(msg || 'Error al autenticar con Supabase. Inténtalo de nuevo.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#070b14] text-slate-100 flex flex-col justify-center items-center p-4 relative overflow-hidden select-none">
      {/* Background ambient lighting */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,rgba(37,99,235,0.2),rgba(255,255,255,0))] pointer-events-none" />
      <div className="absolute -top-32 left-1/2 -translate-x-1/2 w-[600px] h-[300px] bg-blue-500/10 blur-[120px] pointer-events-none" />

      {/* Main Login Card */}
      <div className="w-full max-w-[420px] bg-slate-900/80 backdrop-blur-2xl border border-slate-800/90 rounded-2xl shadow-[0_25px_50px_-12px_rgba(0,0,0,0.7)] overflow-hidden relative z-10">
        
        {/* Header */}
        <div className="pt-8 pb-6 px-8 text-center border-b border-slate-800/60 bg-slate-950/40">
          <div className="w-12 h-12 bg-blue-600/10 border border-blue-500/30 rounded-xl mx-auto flex items-center justify-center text-blue-400 mb-3 shadow-inner">
            <Trophy className="w-6 h-6" />
          </div>
          
          <h1 className="text-base font-bold tracking-[0.2em] uppercase font-mono text-white">
            DEPARTAMENTO SCOUTING
          </h1>
          <p className="text-[11px] text-slate-400 font-mono mt-1 flex items-center justify-center gap-1.5">
            <ShieldCheck className="w-3.5 h-3.5 text-blue-400" />
            <span>Acceso al Sistema</span>
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-8 space-y-4">
          
          {errorMessage && (
            <div className="p-3 bg-red-950/50 border border-red-800/80 rounded-xl flex items-start space-x-2.5 text-red-200 text-xs shadow-inner">
              <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
              <span className="leading-relaxed font-medium">{errorMessage}</span>
            </div>
          )}

          {/* Email / Usuario */}
          <div className="space-y-1">
            <label className="block text-[10px] font-bold text-slate-400 uppercase font-mono tracking-wider">
              Email / Usuario
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                <Mail className="w-4 h-4" />
              </div>
              <input
                type="email"
                required
                autoComplete="email"
                placeholder="danielsaugar@gmail.com"
                value={email}
                onChange={(e) => { setEmail(e.target.value); setErrorMessage(null); }}
                className="w-full bg-slate-950/70 border border-slate-800 rounded-xl pl-10 pr-3.5 py-2.5 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 font-mono transition"
              />
            </div>
          </div>

          {/* Contraseña */}
          <div className="space-y-1">
            <label className="block text-[10px] font-bold text-slate-400 uppercase font-mono tracking-wider">
              Contraseña
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                <Lock className="w-4 h-4" />
              </div>
              <input
                type={showPassword ? 'text' : 'password'}
                required
                autoComplete="current-password"
                placeholder="••••••••••••"
                value={password}
                onChange={(e) => { setPassword(e.target.value); setErrorMessage(null); }}
                className="w-full bg-slate-950/70 border border-slate-800 rounded-xl pl-10 pr-10 py-2.5 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 font-mono transition"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-500 hover:text-slate-300 transition cursor-pointer"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* Botón Iniciar Sesión */}
          <button
            type="submit"
            disabled={loading}
            className="w-full !mt-6 py-2.5 px-4 bg-blue-600 hover:bg-blue-500 text-white font-mono font-bold text-xs uppercase tracking-wider rounded-xl transition-all shadow-lg shadow-blue-600/20 active:scale-[0.99] disabled:opacity-50 flex items-center justify-center space-x-2 cursor-pointer"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin text-white" />
                <span>Verificando credenciales...</span>
              </>
            ) : (
              <>
                <span>Iniciar Sesión</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>

        {/* Footer info badge */}
        <div className="px-6 py-3.5 bg-slate-950/70 border-t border-slate-850/60 flex items-center justify-center text-[10px] text-slate-500 font-mono text-center">
          <span>Autenticación sincronizada con Supabase Auth</span>
        </div>
      </div>
    </div>
  );
}
