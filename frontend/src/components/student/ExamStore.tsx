import React, { useState, useEffect } from 'react';
import { examService, ExamPackage } from '../../services/exam.service';

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'https://eunacom-backend-v3.onrender.com';

interface ExamStoreProps {
  onPurchase: () => void;
}

export const ExamStore: React.FC<ExamStoreProps> = ({ onPurchase }) => {
  const [packages, setPackages] = useState<ExamPackage[]>([]);
  const [loading, setLoading] = useState(true);
  const [purchasing, setPurchasing] = useState(false);
  const [currentPaymentId, setCurrentPaymentId] = useState<string | null>(null);

  useEffect(() => {
    loadPackages();
  }, []);

  // Polling para verificar estado del pago
  useEffect(() => {
    if (!currentPaymentId) return;

    const checkPaymentStatus = async () => {
      try {
        const response = await fetch(`${API_BASE}/api/payments/flow/check/${currentPaymentId}`, {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('accessToken')}`
          }
        });
        
        const data = await response.json();
        
        if (data.success && data.status === 'PAID') {
          setCurrentPaymentId(null);
          setPurchasing(false);
          alert('✅ ¡Pago confirmado! Tu paquete de pruebas ha sido acreditado.');
          onPurchase();
        }
      } catch (error) {
        console.error('Error checking payment:', error);
      }
    };

    const interval = setInterval(checkPaymentStatus, 3000);
    const timeout = setTimeout(() => {
      clearInterval(interval);
      setCurrentPaymentId(null);
      setPurchasing(false);
    }, 300000);

    return () => {
      clearInterval(interval);
      clearTimeout(timeout);
    };
  }, [currentPaymentId, onPurchase]);

  const loadPackages = async () => {
    try {
      const data = await examService.listPackages();
      // Ordenar por precio de menor a mayor
      const sortedPackages = data.sort((a, b) => a.price - b.price);
      setPackages(sortedPackages);
    } catch (error) {
      console.error('Error loading exam packages:', error);
      alert('Error al cargar paquetes de pruebas');
    } finally {
      setLoading(false);
    }
  };

  const handleBuyPackage = async (pkg: ExamPackage) => {
    setPurchasing(true);
    
    try {
      const response = await fetch(`${API_BASE}/api/payments/flow/create-exam-purchase`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('accessToken')}`
        },
        body: JSON.stringify({ packageId: pkg.id })
      });

      const data = await response.json();

      if (data.success && data.url) {
        setCurrentPaymentId(data.paymentId);
        window.location.href = data.url;
      } else {
        throw new Error(data.message || 'Error al crear el pago');
      }
      
    } catch (error: any) {
      console.error('Error purchasing package:', error);
      alert(error.message || 'Error al procesar la compra');
      setPurchasing(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center p-12">
        <div className="text-gray-600">Cargando paquetes...</div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto p-6">
      <h2 className="text-2xl font-bold text-gray-900 mb-2">
        🎓 Comprar Pruebas EUNACOM
      </h2>
      <p className="text-gray-600 mb-8">
        Pruebas completas de 45 preguntas para evaluar tu preparación
      </p>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {packages.map((pkg) => {
          const pricePerExam = Math.round(pkg.price / pkg.examQty);
          
          return (
            <div
              key={pkg.id}
              className="bg-white border-2 border-gray-200 rounded-xl p-6 hover:border-blue-400 hover:shadow-lg transition-all"
            >
              <div className="text-center">
                <h3 className="text-xl font-bold text-gray-900 mb-2">
                  {pkg.name}
                </h3>
                <p className="text-sm text-gray-600 mb-4">
                  {pkg.description || `${pkg.examQty} pruebas de 45 preguntas`}
                </p>

                <div className="bg-blue-50 rounded-lg p-4 mb-4">
                  <div className="text-3xl font-bold text-blue-600 mb-1">
                    ${pkg.price.toLocaleString()}
                  </div>
                  <div className="text-sm text-gray-600">
                    ${pricePerExam.toLocaleString()} por prueba
                  </div>
                </div>

                <div className="space-y-2 mb-6 text-left">
                  <div className="flex items-center text-sm text-gray-700">
                    <span className="mr-2">✅</span>
                    <span>{pkg.examQty} pruebas completas</span>
                  </div>
                  <div className="flex items-center text-sm text-gray-700">
                    <span className="mr-2">✅</span>
                    <span>45 preguntas por prueba</span>
                  </div>
                  <div className="flex items-center text-sm text-gray-700">
                    <span className="mr-2">✅</span>
                    <span>Revisión detallada</span>
                  </div>
                  <div className="flex items-center text-sm text-gray-700">
                    <span className="mr-2">✅</span>
                    <span>Estadísticas avanzadas</span>
                  </div>
                </div>

                <button
                  onClick={() => handleBuyPackage(pkg)}
                  disabled={purchasing}
                  className={`w-full py-3 rounded-lg font-semibold transition-colors ${
                    purchasing
                      ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                      : 'bg-blue-600 text-white hover:bg-blue-700'
                  }`}
                >
                  {purchasing ? 'Procesando...' : 'Comprar Ahora'}
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {packages.length === 0 && !loading && (
        <div className="text-center py-12 text-gray-500">
          No hay paquetes de pruebas disponibles en este momento
        </div>
      )}
    </div>
  );
};

