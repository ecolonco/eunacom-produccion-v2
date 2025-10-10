import React, { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { CreditsService } from '../../services/credits.service';
import { PracticeHub } from '../quiz/PracticeHub';
import { QuickPractice } from '../quiz/QuickPractice';
import { PaymentsService } from '../../services/payments.service';

// Sistema de créditos v2 - Oct 2025
export const StudentDashboard: React.FC = () => {
  const { state, logout, setUserCredits } = useAuth();
  const { user } = state;
  const [practiceView, setPracticeView] = useState<'none' | 'hub' | 'random' | 'specialty' | 'random20' | 'random90'>('none');
  const [isPurchasing, setIsPurchasing] = useState(false);

  // Verificar pago pendiente al volver de Flow
  React.useEffect(() => {
    const checkPendingPayment = async () => {
      const paymentId = localStorage.getItem('pendingPaymentId');
      if (!paymentId || !state.isAuthenticated) return;
      
      try {
        const result = await PaymentsService.checkPaymentStatus(paymentId);
        if (result.status === 'PAID' && result.credited) {
          localStorage.removeItem('pendingPaymentId');
          alert('¡Pago exitoso! Se acreditaron 400 créditos.');
          window.location.reload();
        } else if (result.status === 'PENDING') {
          // Reintentar en 5 segundos
          setTimeout(checkPendingPayment, 5000);
        } else {
          localStorage.removeItem('pendingPaymentId');
        }
      } catch (e: any) {
        // Si falla por auth, reintentar (puede ser token refrescándose)
        if (e?.message?.includes('401') || e?.message?.includes('autenticación')) {
          setTimeout(checkPendingPayment, 5000);
        } else {
          console.error('Error checking payment:', e);
          localStorage.removeItem('pendingPaymentId');
        }
      }
    };
    
    if (state.isAuthenticated) {
      checkPendingPayment();
    }
  }, [state.isAuthenticated]);

  if (!user) return null;

  // If a practice view is open, show it instead of the dashboard
  if (practiceView === 'hub') {
    return <PracticeHub onClose={() => setPracticeView('none')} />;
  }

  if (practiceView === 'random') {
    return (
      <QuickPractice
        onClose={() => setPracticeView('none')}
        title="Práctica Aleatoria"
      />
    );
  }

  if (practiceView === 'specialty') {
    return (
      <QuickPractice
        onClose={() => setPracticeView('none')}
        requireSpecialty
        title="Práctica por Especialidad"
      />
    );
  }

  if (practiceView === 'random20') {
    return (
      <QuickPractice
        onClose={() => setPracticeView('none')}
        maxQuestions={20}
        title="20 Preguntas Aleatorias"
        prepaid
      />
    );
  }

  if (practiceView === 'random90') {
    return (
      <QuickPractice
        onClose={() => setPracticeView('none')}
        maxQuestions={90}
        title="90 Preguntas Aleatorias - Simulacro"
        prepaid
      />
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <header className="bg-white rounded-lg shadow-md p-6 mb-8">
          <div className="text-center mb-6">
            <h1 className="text-3xl font-bold text-gray-800">
              ¡Bienvenido, {user.firstName}!
            </h1>
            <p className="text-gray-600 mt-1">
              🎓 Estudiante • {user.credits} créditos disponibles
            </p>
          </div>
          
          <div className="space-y-3 max-w-md mx-auto">
            <button
              onClick={async () => {
                if (isPurchasing) return;
                try {
                  setIsPurchasing(true);
                  const { url, paymentId } = await PaymentsService.createFlowPayment();
                  // Guardar paymentId para verificar al volver
                  localStorage.setItem('pendingPaymentId', paymentId);
                  window.location.href = url; // redirigir a Flow
                } catch (e: any) {
                  alert(e?.message || 'No se pudo iniciar el pago.');
                  setIsPurchasing(false);
                }
              }}
              className="w-full px-6 py-3 bg-amber-600 text-white rounded-md hover:bg-amber-700 transition duration-200 font-medium"
            >
              💳 Comprar 400 créditos por $20.000
            </button>
            <button
              onClick={() => setPracticeView('random')}
              className="w-full px-6 py-3 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition duration-200 font-medium"
            >
              🎯 Practica ejercicios aleatoriamente (1 crédito)
            </button>
            <button
              onClick={async () => {
                if (isPurchasing) return;
                try {
                  setIsPurchasing(true);
                  // Descontar 15 créditos al inicio
                  const { newBalance } = await CreditsService.deductCredits({
                    packageType: 'PACK_20',
                    metadata: { source: 'STUDENT_DASHBOARD' }
                  });
                  // Actualizar saldo global
                  setUserCredits(newBalance);
                  // Abrir la sesión de 20 preguntas
                  setPracticeView('random20');
                } catch (err: any) {
                  if (err?.message === 'INSUFFICIENT_CREDITS') {
                    alert('No tienes suficientes créditos para este paquete (15 créditos).');
                  } else {
                    alert('No se pudo procesar la compra del paquete. Intenta nuevamente.');
                  }
                } finally {
                  setIsPurchasing(false);
                }
              }}
              className="w-full px-6 py-3 bg-teal-600 text-white rounded-md hover:bg-teal-700 transition duration-200 font-medium"
            >
              🔢 20 Preguntas aleatoriamente (15 créditos)
            </button>
            <button
              onClick={async () => {
                if (isPurchasing) return;
                try {
                  setIsPurchasing(true);
                  // Descontar 60 créditos al inicio
                  const { newBalance } = await CreditsService.deductCredits({
                    packageType: 'PACK_90',
                    metadata: { source: 'STUDENT_DASHBOARD' }
                  });
                  // Actualizar saldo global
                  setUserCredits(newBalance);
                  // Abrir la sesión de 90 preguntas
                  setPracticeView('random90');
                } catch (err: any) {
                  if (err?.message === 'INSUFFICIENT_CREDITS') {
                    alert('No tienes suficientes créditos para este paquete (60 créditos).');
                  } else {
                    alert('No se pudo procesar la compra del paquete. Intenta nuevamente.');
                  }
                } finally {
                  setIsPurchasing(false);
                }
              }}
              className="w-full px-6 py-3 bg-green-600 text-white rounded-md hover:bg-green-700 transition duration-200 font-medium"
            >
              📋 90 preguntas tipo Eunacom (60 créditos)
            </button>
            <button
              onClick={() => logout()}
              className="w-full px-6 py-3 bg-red-600 text-white rounded-md hover:bg-red-700 transition duration-200 font-medium"
            >
              Cerrar Sesión
            </button>
          </div>
        </header>

        {/* Simple dashboard - solo información esencial */}
      </div>
    </div>
  );
};
