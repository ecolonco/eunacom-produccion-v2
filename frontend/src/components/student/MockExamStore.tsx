import React, { useState, useEffect } from 'react';
import { mockExamService, MockExamPackage } from '../../services/mock-exam.service';

interface MockExamStoreProps {
  onPurchase: () => void;
}

export const MockExamStore: React.FC<MockExamStoreProps> = ({ onPurchase }) => {
  const [packages, setPackages] = useState<MockExamPackage[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadPackages();
  }, []);

  const loadPackages = async () => {
    try {
      const data = await mockExamService.listPackages();
      setPackages(data);
    } catch (error) {
      console.error('Error loading mock exam packages:', error);
      alert('Error al cargar paquetes de ensayos');
    } finally {
      setLoading(false);
    }
  };

  const handleBuyPackage = (pkg: MockExamPackage) => {
    alert(`Compra de ensayos próximamente disponible.\n\nPaquete: ${pkg.name}\nPrecio: $${pkg.price.toLocaleString()}`);
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
        🎯 Comprar Ensayos EUNACOM
      </h2>
      <p className="text-gray-600 mb-8">
        Ensayos completos de 180 preguntas para simular el examen real
      </p>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {packages.map((pkg) => {
          const pricePerExam = Math.round(pkg.price / pkg.mockExamQty);
          const isPopular = pkg.mockExamQty === 3;
          
          return (
            <div
              key={pkg.id}
              className={`bg-white border-2 rounded-xl p-6 hover:shadow-lg transition-all ${
                isPopular ? 'border-green-400 ring-2 ring-green-200' : 'border-gray-200 hover:border-green-400'
              }`}
            >
              {isPopular && (
                <div className="bg-green-500 text-white text-xs font-bold px-3 py-1 rounded-full inline-block mb-3">
                  MÁS POPULAR
                </div>
              )}
              
              <div className="text-center">
                <h3 className="text-xl font-bold text-gray-900 mb-2">
                  {pkg.name}
                </h3>
                <p className="text-sm text-gray-600 mb-4">
                  {pkg.description || `${pkg.mockExamQty} ensayo${pkg.mockExamQty > 1 ? 's' : ''} de 180 preguntas`}
                </p>

                <div className="bg-green-50 rounded-lg p-4 mb-4">
                  <div className="text-3xl font-bold text-green-600 mb-1">
                    ${pkg.price.toLocaleString()}
                  </div>
                  <div className="text-sm text-gray-600">
                    ${pricePerExam.toLocaleString()} por ensayo
                  </div>
                </div>

                <div className="space-y-2 mb-6 text-left">
                  <div className="flex items-center text-sm text-gray-700">
                    <span className="mr-2">✅</span>
                    <span>{pkg.mockExamQty} ensayo{pkg.mockExamQty > 1 ? 's' : ''} completo{pkg.mockExamQty > 1 ? 's' : ''}</span>
                  </div>
                  <div className="flex items-center text-sm text-gray-700">
                    <span className="mr-2">✅</span>
                    <span>180 preguntas por ensayo</span>
                  </div>
                  <div className="flex items-center text-sm text-gray-700">
                    <span className="mr-2">✅</span>
                    <span>Simulación real EUNACOM</span>
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
                  className={`w-full py-3 rounded-lg font-semibold transition-colors ${
                    isPopular
                      ? 'bg-green-600 text-white hover:bg-green-700'
                      : 'bg-green-600 text-white hover:bg-green-700'
                  }`}
                >
                  Comprar Ahora
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {packages.length === 0 && !loading && (
        <div className="text-center py-12 text-gray-500">
          No hay paquetes de ensayos disponibles en este momento
        </div>
      )}
    </div>
  );
};

