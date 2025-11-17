import { ReactNode } from 'react';
import { useAuth } from '@/contexts/AuthContextSimple';
import { LogOut } from 'lucide-react';

interface LayoutProps {
  children: ReactNode;
}

export default function Layout({ children }: LayoutProps) {
  const { profile, signOut } = useAuth();

  const handleSignOut = async () => {
    try {
      await signOut();
    } catch (error) {
      console.error('Erro ao fazer logout:', error);
    }
  };

  console.log('🏗️ Layout renderizando...', { profile: !!profile });

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#f8fafc' }}>
      {/* Header simples */}
      <header style={{
        backgroundColor: 'white',
        borderBottom: '1px solid #e5e7eb',
        padding: '1rem 2rem',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div style={{
            width: '40px',
            height: '40px',
            backgroundColor: '#3b82f6',
            borderRadius: '8px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'white',
            fontWeight: 'bold',
            fontSize: '1.25rem'
          }}>
            M
          </div>
          <div>
            <h1 style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#1f2937', margin: 0 }}>
              MedIntelli
            </h1>
            <p style={{ fontSize: '0.875rem', color: '#6b7280', margin: 0 }}>
              Sistema de Gestão Médica
            </p>
          </div>
        </div>
        
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div style={{ textAlign: 'right' }}>
            <p style={{ fontSize: '0.875rem', color: '#6b7280', margin: 0 }}>
              Olá, {profile?.nome || 'Usuário'}
            </p>
            <p style={{ fontSize: '0.75rem', color: '#9ca3af', margin: 0 }}>
              {profile?.role || 'Usuário'}
            </p>
          </div>
          <button
            onClick={handleSignOut}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              padding: '0.5rem 1rem',
              backgroundColor: '#ef4444',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer',
              fontSize: '0.875rem'
            }}
          >
            <LogOut size={16} />
            Sair
          </button>
        </div>
      </header>

      {/* Conteúdo principal */}
      <main style={{ padding: '2rem' }}>
        {children}
      </main>
    </div>
  );
}
