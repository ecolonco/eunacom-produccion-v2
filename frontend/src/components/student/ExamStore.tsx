import React, { useState, useEffect } from 'react';
import { examService, ExamPackage } from '../../services/exam.service';

interface ExamStoreProps {
  onPurchase: () => void;
}

export const ExamStore: React.FC<ExamStoreProps> = ({ onPurchase }) => {
  const [packages, setPackages] = useState<ExamPackage[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadPackages();
  }, []);

  const loadPackages = async () => {
    try {
      const data = await examService.listPackages();
      setPackages(data);
    } catch (error) {
      console.error('Error loading exam packages:', error);
      alert('Error al cargar paquetes de pruebas');
    } finally {
      setLoading(false);
    }
  };

  const handleBuyPackage = (pkg: ExamPackage) => {
    alert(`Compra de paquetes de pruebas próximamente disponible.\n\nPaquete: ${pkg.name}\nPrecio: $${pkg.price.toLocaleString()}`);
    // TODO: Integrar con Flow.cl
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
                  className="w-full bg-blue-600 text-white py-3 rounded-lg font-semibold hover:bg-blue-700 transition-colors"
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
          No hay paquetes de pruebas disponibles en este momento
        </div>
      )}
    </div>
  );
};

