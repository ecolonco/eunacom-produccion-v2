import React, { useState, useEffect } from 'react';
import { controlService, ControlPackage } from '../../services/control.service';

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'https://eunacom-backend-v3.onrender.com';

interface ControlStoreProps {
  onPurchaseSuccess: () => void;
}

export const ControlStore: React.FC<ControlStoreProps> = ({ onPurchaseSuccess }) => {
  const [packages, setPackages] = useState<ControlPackage[]>([]);
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
          // Pago exitoso
          setCurrentPaymentId(null);
          setPurchasing(false);
          alert('✅ ¡Pago confirmado! Tu paquete de controles ha sido acreditado.');
          onPurchaseSuccess();
        }
      } catch (error) {
        console.error('Error checking payment:', error);
      }
    };

    // Verificar cada 3 segundos
    const interval = setInterval(checkPaymentStatus, 3000);
    
    // Detener después de 5 minutos
    const timeout = setTimeout(() => {
      clearInterval(interval);
      setCurrentPaymentId(null);
      setPurchasing(false);
    }, 300000);

    return () => {
      clearInterval(interval);
      clearTimeout(timeout);
    };
  }, [currentPaymentId, onPurchaseSuccess]);

  const loadPackages = async () => {
    try {
      const data = await controlService.listPackages();
      setPackages(data);
    } catch (error) {
      console.error('Error loading packages:', error);
      alert('Error al cargar los paquetes');
    } finally {
      setLoading(false);
    }
  };

  const handlePurchase = async (pkg: ControlPackage) => {
    setPurchasing(true);
    
    try {
      const response = await fetch(`${API_BASE}/api/payments/flow/create-control-purchase`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('accessToken')}`
        },
        body: JSON.stringify({ packageId: pkg.id })
      });

      const data = await response.json();

      if (data.success && data.url) {
        // Guardar ID de pago para polling
        setCurrentPaymentId(data.paymentId);
        
        // Redirigir a Flow.cl
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
      <div className="flex justify-center items-center p-8">
        <div className="text-gray-600">Cargando paquetes...</div>
      </div>
    );
  }

  if (packages.length === 0) {
    return (
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6 text-center">
        <p className="text-yellow-800">
          📦 No hay paquetes disponibles en este momento.
        </p>
        <p className="text-yellow-600 text-sm mt-2">
          Contacta al administrador para más información.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
        <h3 className="text-xl font-bold text-blue-900 mb-2">
          📝 ¿Qué son los Controles?
        </h3>
        <ul className="text-blue-800 space-y-2">
          <li>• Cada control contiene <strong>15 preguntas aleatorias</strong></li>
          <li>• Simula un examen real de EUNACOM</li>
          <li>• Recibe tu puntaje y revisión detallada al finalizar</li>
          <li>• Identifica tus fortalezas y áreas de mejora</li>
        </ul>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {packages.map((pkg) => (
          <div
            key={pkg.id}
            className="bg-white border-2 border-gray-200 rounded-lg p-6 hover:border-blue-500 transition-all hover:shadow-lg"
          >
            <div className="text-center mb-4">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-100 rounded-full mb-3">
                <span className="text-3xl">📋</span>
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">
                {pkg.name}
              </h3>
              {pkg.description && (
                <p className="text-gray-600 text-sm mb-3">
                  {pkg.description}
                </p>
              )}
            </div>

            <div className="space-y-3 mb-6">
              <div className="flex items-center justify-between py-2 border-b border-gray-200">
                <span className="text-gray-600">Cantidad:</span>
                <span className="font-semibold text-gray-900">
                  {pkg.controlQty} controles
                </span>
              </div>
              <div className="flex items-center justify-between py-2 border-b border-gray-200">
                <span className="text-gray-600">Preguntas:</span>
                <span className="font-semibold text-gray-900">
                  {pkg.controlQty * 15} preguntas
                </span>
              </div>
              <div className="flex items-center justify-between py-2">
                <span className="text-gray-600">Precio:</span>
                <span className="font-bold text-2xl text-blue-600">
                  ${pkg.price.toLocaleString('es-CL')}
                </span>
              </div>
              <div className="text-center text-sm text-gray-500">
                ${Math.round(pkg.price / pkg.controlQty).toLocaleString('es-CL')} por control
              </div>
            </div>

            <button
              onClick={() => handlePurchase(pkg)}
              disabled={purchasing}
              className={`w-full py-3 px-6 rounded-lg font-semibold transition-all ${
                purchasing
                  ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                  : 'bg-blue-600 text-white hover:bg-blue-700 shadow-md hover:shadow-lg'
              }`}
            >
              {purchasing ? 'Procesando...' : '🛒 Comprar Ahora'}
            </button>

            <p className="text-xs text-gray-500 text-center mt-3">
              Pago seguro a través de Flow.cl
            </p>
          </div>
        ))}
      </div>

      <div className="bg-gray-50 border border-gray-200 rounded-lg p-6">
        <h4 className="font-semibold text-gray-900 mb-3">💡 Recomendaciones:</h4>
        <ul className="text-gray-700 space-y-2 text-sm">
          <li>• Realiza los controles en un ambiente tranquilo y sin interrupciones</li>
          <li>• Simula condiciones de examen real (sin apuntes ni consultas)</li>
          <li>• Revisa cuidadosamente las explicaciones al finalizar</li>
          <li>• Identifica patrones en tus errores para mejorar</li>
        </ul>
      </div>
    </div>
  );
};

