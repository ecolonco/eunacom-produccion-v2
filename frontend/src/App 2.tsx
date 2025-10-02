import { AcademicCapIcon, HeartIcon, ChartBarIcon } from '@heroicons/react/24/outline';

function App() {
  const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000';

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-50 to-medical-100">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center space-x-3">
              <div className="bg-primary-600 p-2 rounded-lg">
                <AcademicCapIcon className="h-8 w-8 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">
                  {import.meta.env.VITE_APP_NAME || 'EUNACOM Learning Platform'}
                </h1>
                <p className="text-sm text-gray-500">Preparación médica con IA</p>
              </div>
            </div>
            <div className="badge-primary">
              v{import.meta.env.VITE_APP_VERSION || '1.0.0'}
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="text-center mb-12">
          <h2 className="text-4xl font-bold text-gray-900 mb-4">
            Bienvenido a la plataforma EUNACOM
          </h2>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            La plataforma más avanzada para preparar tu examen EUNACOM con inteligencia artificial,
            gamificación y contenido médico validado por expertos.
          </p>
        </div>

        {/* Feature Cards */}
        <div className="grid md:grid-cols-3 gap-8 mb-12">
          <div className="card p-6 text-center hover:shadow-elevated transition-shadow duration-300">
            <div className="bg-primary-100 p-3 rounded-full inline-block mb-4">
              <AcademicCapIcon className="h-8 w-8 text-primary-600" />
            </div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">IA Médica Avanzada</h3>
            <p className="text-gray-600">
              Genera preguntas adaptativas y explicaciones detalladas con inteligencia artificial especializada en medicina.
            </p>
          </div>

          <div className="card p-6 text-center hover:shadow-elevated transition-shadow duration-300">
            <div className="bg-secondary-100 p-3 rounded-full inline-block mb-4">
              <ChartBarIcon className="h-8 w-8 text-secondary-600" />
            </div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">Analytics Detallado</h3>
            <p className="text-gray-600">
              Seguimiento completo de tu progreso por especialidades médicas con identificación de fortalezas y debilidades.
            </p>
          </div>

          <div className="card p-6 text-center hover:shadow-elevated transition-shadow duration-300">
            <div className="bg-accent-100 p-3 rounded-full inline-block mb-4">
              <HeartIcon className="h-8 w-8 text-accent-600" />
            </div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">Contenido Validado</h3>
            <p className="text-gray-600">
              Todo el contenido es revisado por médicos especialistas para garantizar la máxima calidad y precisión.
            </p>
          </div>
        </div>

        {/* Status Cards */}
        <div className="grid md:grid-cols-2 gap-6 mb-8">
          <div className="card p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-3">Estado del Frontend</h3>
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-gray-600">React + TypeScript</span>
                <span className="badge-success">✓ Configurado</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-600">Tailwind CSS</span>
                <span className="badge-success">✓ Configurado</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-600">Vite + HMR</span>
                <span className="badge-success">✓ Funcionando</span>
              </div>
            </div>
          </div>

          <div className="card p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-3">Conexión API</h3>
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-gray-600">Backend URL</span>
                <span className="text-sm font-mono bg-gray-100 px-2 py-1 rounded">
                  {apiUrl}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-600">Estado</span>
                <span className="badge-warning">⏳ Pendiente</span>
              </div>
            </div>
          </div>
        </div>

        {/* Call to Action */}
        <div className="text-center">
          <div className="card p-8 bg-gradient-to-r from-primary-500 to-primary-600 text-white">
            <h3 className="text-2xl font-bold mb-4">¿Listo para comenzar tu preparación?</h3>
            <p className="text-primary-100 mb-6">
              Únete a miles de estudiantes que ya están preparándose con nuestra plataforma.
            </p>
            <div className="space-x-4">
              <button className="bg-white text-primary-600 px-6 py-3 rounded-lg font-semibold hover:bg-primary-50 transition-colors duration-200">
                Crear Cuenta Gratuita
              </button>
              <button className="border border-primary-300 text-white px-6 py-3 rounded-lg font-semibold hover:bg-primary-700 transition-colors duration-200">
                Iniciar Sesión
              </button>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-medical-900 text-white py-8 mt-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <p className="text-medical-300">
            © 2025 EUNACOM Learning Platform. Preparación médica de última generación.
          </p>
        </div>
      </footer>
    </div>
  );
}

export default App;
