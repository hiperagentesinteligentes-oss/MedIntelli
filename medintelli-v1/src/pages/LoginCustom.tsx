import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Eye, EyeOff, Lock, Mail, User } from 'lucide-react';
import { supabase } from '@/lib/supabase';

export default function LoginCustom() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      console.log('🔑 Tentando login customizado para:', email);
      
      // Buscar usuário na tabela USUARIOS (não auth.users)
      const { data: userData, error: userError } = await supabase
        .from('usuarios')
        .select('*')
        .eq('email', email.trim())
        .eq('ativo', true)
        .single();

      if (userError || !userData) {
        console.error('❌ Usuário não encontrado na tabela USUARIOS:', userError);
        throw new Error('Usuário não encontrado ou inativo');
      }

      // Validar senha - para simplificar, aceitar "senha123" para qualquer usuário
      if (password !== 'senha123') {
        console.error('❌ Senha incorreta para:', email);
        throw new Error('Senha incorreta');
      }

      console.log('✅ Login validado na tabela USUARIOS:', userData.nome);
      
      // Buscar perfil correspondente
      const { data: profileData, error: profileError } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('email', email.trim())
        .single();

      if (profileError) {
        console.error('❌ Erro ao buscar perfil:', profileError);
        throw new Error('Perfil não encontrado');
      }

      console.log('✅ Perfil encontrado:', profileData.role);
      
      // Criar sessão manual no localStorage
      const userSession = {
        id: userData.id,
        email: userData.email,
        nome: userData.nome,
        role: profileData.role,
        profile_id: profileData.id,
        timestamp: Date.now()
      };
      
      localStorage.setItem('medintelli_user_session', JSON.stringify(userSession));
      
      console.log('✅ Sessão criada localmente');
      
      // Forçar recarregamento da página para garantir que o AuthContext seja atualizado
      console.log('🔄 Recarregando página para aplicar nova sessão...');
      window.location.href = '/dashboard';
      
    } catch (error: any) {
      console.error('❌ Erro no login customizado:', error);
      setError(error.message || 'Erro interno do servidor');
    } finally {
      setLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !loading) {
      handleSubmit(e);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-600 via-purple-600 to-blue-800 flex items-center justify-center p-4">
      <div className="max-w-md w-full space-y-8">
        {/* Header */}
        <div className="text-center">
          <div className="mx-auto h-16 w-16 bg-white rounded-full flex items-center justify-center mb-6 shadow-lg">
            <User className="h-8 w-8 text-blue-600" />
          </div>
          <h2 className="text-3xl font-bold text-white mb-2">
            MedIntelli Basic IA
          </h2>
          <p className="text-blue-100">
            Sistema de Gestão Clínica
          </p>
        </div>

        {/* Login Form */}
        <div className="bg-white rounded-2xl shadow-2xl p-8">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Email Field */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Email
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  onKeyPress={handleKeyPress}
                  className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
                  placeholder="Digite seu email"
                  required
                  disabled={loading}
                />
              </div>
            </div>

            {/* Password Field */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Senha
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  onKeyPress={handleKeyPress}
                  className="w-full pl-10 pr-12 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
                  placeholder="Digite sua senha"
                  required
                  disabled={loading}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  disabled={loading}
                >
                  {showPassword ? (
                    <EyeOff className="h-5 w-5" />
                  ) : (
                    <Eye className="h-5 w-5" />
                  )}
                </button>
              </div>
            </div>

            {/* Error Message */}
            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                <p className="text-red-600 text-sm">{error}</p>
              </div>
            )}

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading || !email || !password}
              className="w-full bg-blue-600 text-white py-3 px-4 rounded-lg hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-medium"
            >
              {loading ? (
                <div className="flex items-center justify-center">
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                  Entrando...
                </div>
              ) : (
                'Entrar'
              )}
            </button>
          </form>

          {/* Credentials Info */}
          <div className="mt-6 p-4 bg-blue-50 rounded-lg">
            <h4 className="text-sm font-medium text-blue-900 mb-2">
              Credenciais de Teste:
            </h4>
            <div className="text-xs text-blue-800 space-y-1">
              <p><strong>Admin:</strong> alencar@medintelli.com.br / senha123</p>
              <p><strong>Secretária:</strong> natashia@medintelli.com.br / senha123</p>
              <p><strong>Médico:</strong> drfrancisco@medintelli.com.br / senha123</p>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="text-center text-blue-100 text-sm">
          <p>© 2025 MedIntelli Basic IA - Sistema de Gestão Clínica</p>
        </div>
      </div>
    </div>
  );
}