import React, { useState, Suspense } from 'react';
import { QueryProvider } from './contexts/QueryProvider';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { AuthModal } from './components/AuthModal';
import { LoginForm } from './components/LoginForm';
import { StudentDashboard } from './components/dashboard/StudentDashboard';
import './App.css';

// Lazy load admin components (code splitting for performance)
const ExerciseFactory = React.lazy(() => import('./ExerciseFactory'));
const TaxonomyInventory = React.lazy(() => import('./components/TaxonomyInventory'));
const TaxonomyAdmin = React.lazy(() => import('./components/TaxonomyAdmin'));
const AdminUsersTable = React.lazy(() => import('./components/admin/AdminUsersTable'));
const ExerciseManagement = React.lazy(() => import('./components/admin/ExerciseManagement'));
const PaymentsTable = React.lazy(() => import('./components/admin/PaymentsTable'));
const QAControlPanel = React.lazy(() => import('./components/admin/QAControlPanel').then(m => ({ default: m.QAControlPanel })));
const QASweep2Panel = React.lazy(() => import('./components/admin/QASweep2Panel').then(m => ({ default: m.QASweep2Panel })));
const MockExamPercentageManager = React.lazy(() => import('./components/admin').then(m => ({ default: m.MockExamPercentageManager })));
const ManualTopicUpload = React.lazy(() => import('./components/admin/ManualTopicUpload'));

// Loading fallback component
const LoadingFallback = () => (
  <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
    <div className="text-center">
      <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600 mx-auto mb-4"></div>
      <p className="text-gray-600">Cargando componente...</p>
    </div>
  </div>
);

// Main App Content Component - Deploy trigger
const AppContent: React.FC = () => {
  const { state, logout } = useAuth();
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login');
  const [apiStatus, setApiStatus] = useState<string>('Checking...');
  const [apiData, setApiData] = useState<any>(null);
  const [currentView, setCurrentView] = useState<'dashboard' | 'exercise-factory'>('dashboard');
  const [adminView, setAdminView] = useState<'menu' | 'factory' | 'manualTopicUpload' | 'taxonomyInventory' | 'taxonomyAdmin' | 'exerciseManagement' | 'adminUsers' | 'payments' | 'qaControl' | 'qaSweep2' | 'mockExamPercentages'>('menu');
  const [showPaymentSuccess, setShowPaymentSuccess] = useState(false);

  // Debug logging
  React.useEffect(() => {
    console.log('Auth State Changed:', {
      isAuthenticated: state.isAuthenticated,
      hasUser: !!state.user,
      isLoading: state.isLoading,
      userId: state.user?.id
    });
  }, [state.isAuthenticated, state.user, state.isLoading]);

  // Debug modal state
  React.useEffect(() => {
    console.log('showAuthModal changed:', showAuthModal, 'authMode:', authMode);
  }, [showAuthModal, authMode]);

  // Check for payment success parameter
  React.useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('payment') === 'success') {
      setShowPaymentSuccess(true);
      // Clean up URL
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }, []);

  React.useEffect(() => {
    // Test API connection
    const testAPI = async () => {
      try {
        const API_BASE = import.meta.env.VITE_API_URL || 'https://eunacom-backend-v3.onrender.com';
        const response = await fetch(`${API_BASE}/`);
        if (response.ok) {
          const data = await response.json();
          setApiData(data);
          setApiStatus('✅ Connected');
        } else {
          setApiStatus('❌ Error connecting');
        }
      } catch (error) {
        setApiStatus('❌ Backend not available');
        console.error('API Error:', error);
      }
    };

    testAPI();
  }, []);

  // Show Exercise Factory if selected
  if (state.isAuthenticated && state.user && currentView === 'exercise-factory') {
    return (
      <Suspense fallback={<LoadingFallback />}>
        <ExerciseFactory onBack={() => setCurrentView('dashboard')} />
      </Suspense>
    );
  }

  // Show dashboard if user is authenticated
  if (state.isAuthenticated && state.user) {
    console.log('Showing Dashboard for user:', state.user.firstName, 'Role:', state.user.role);

    // Show StudentDashboard ONLY for students
    if (state.user.role === 'STUDENT') {
      return <StudentDashboard />;
    }

    // Panel completo para ADMIN/otros roles (all lazy-loaded with Suspense)
    if (adminView === 'factory') {
      return (
        <Suspense fallback={<LoadingFallback />}>
          <ExerciseFactory onBack={() => setAdminView('menu')} />
        </Suspense>
      );
    }
    if (adminView === 'manualTopicUpload') {
      return (
        <Suspense fallback={<LoadingFallback />}>
          <ManualTopicUpload onBack={() => setAdminView('menu')} />
        </Suspense>
      );
    }
    if (adminView === 'taxonomyInventory') {
      return (
        <Suspense fallback={<LoadingFallback />}>
          <TaxonomyInventory onBack={() => setAdminView('menu')} />
        </Suspense>
      );
    }
    if (adminView === 'taxonomyAdmin') {
      return (
        <Suspense fallback={<LoadingFallback />}>
          <TaxonomyAdmin onBack={() => setAdminView('menu')} />
        </Suspense>
      );
    }
    if (adminView === 'exerciseManagement') {
      return (
        <Suspense fallback={<LoadingFallback />}>
          <ExerciseManagement onBack={() => setAdminView('menu')} />
        </Suspense>
      );
    }
    if (adminView === 'adminUsers') {
      return (
        <Suspense fallback={<LoadingFallback />}>
          <AdminUsersTable onBack={() => setAdminView('menu')} />
        </Suspense>
      );
    }
    if (adminView === 'payments') {
      return (
        <Suspense fallback={<LoadingFallback />}>
          <PaymentsTable onBack={() => setAdminView('menu')} />
        </Suspense>
      );
    }

    if (adminView === 'qaControl') {
      return (
        <Suspense fallback={<LoadingFallback />}>
          <QAControlPanel onBack={() => setAdminView('menu')} />
        </Suspense>
      );
    }
    if (adminView === 'qaSweep2') {
      return (
        <Suspense fallback={<LoadingFallback />}>
          <QASweep2Panel onBack={() => setAdminView('menu')} />
        </Suspense>
      );
    }
    if (adminView === 'mockExamPercentages') {
      return (
        <Suspense fallback={<LoadingFallback />}>
          <MockExamPercentageManager onBack={() => setAdminView('menu')} />
        </Suspense>
      );
    }

    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 to-emerald-50 flex items-center justify-center p-8">
        <div className="bg-white shadow-md rounded-lg p-8 max-w-lg w-full text-center">
          <h2 className="text-2xl font-bold mb-2">Panel Administrativo</h2>
          <p className="text-gray-600 mb-6">Bienvenido, {state.user.firstName}.</p>
          <div className="space-y-3 text-left">
            <button className="w-full px-6 py-3 bg-green-600 text-white rounded-md hover:bg-green-700" onClick={() => setAdminView('factory')}>🏭 Fábrica de Ejercicios</button>
            <button className="w-full px-6 py-3 bg-lime-600 text-white rounded-md hover:bg-lime-700" onClick={() => setAdminView('manualTopicUpload')}>🎯 Carga Manual por Tópico</button>
            <button className="w-full px-6 py-3 bg-indigo-600 text-white rounded-md hover:bg-indigo-700" onClick={() => setAdminView('adminUsers')}>👥 Gestión de Usuarios</button>
            <button className="w-full px-6 py-3 bg-blue-600 text-white rounded-md hover:bg-blue-700" onClick={() => setAdminView('payments')}>💳 Pagos y Transacciones</button>
            <button className="w-full px-6 py-3 bg-red-600 text-white rounded-md hover:bg-red-700" onClick={() => setAdminView('qaControl')}>🔍 Control QA - Variaciones</button>
            <button className="w-full px-6 py-3 bg-orange-600 text-white rounded-md hover:bg-orange-700" onClick={() => setAdminView('qaSweep2')}>🤖 QA Sweep 2.0 - IA Avanzada</button>
            <button className="w-full px-6 py-3 bg-purple-600 text-white rounded-md hover:bg-purple-700" onClick={() => setAdminView('taxonomyInventory')}>📊 Inventario de Taxonomía</button>
            <button className="w-full px-6 py-3 bg-amber-600 text-white rounded-md hover:bg-amber-700" onClick={() => setAdminView('taxonomyAdmin')}>⚙️ Gestión de Taxonomía</button>
            <button className="w-full px-6 py-3 bg-teal-600 text-white rounded-md hover:bg-teal-700" onClick={() => setAdminView('mockExamPercentages')}>📊 Distribución de Ensayos EUNACOM</button>
            <button className="w-full px-6 py-3 bg-emerald-600 text-white rounded-md hover:bg-emerald-700" onClick={() => setAdminView('exerciseManagement')}>📋 Listado de Ejercicios</button>
            <button className="w-full px-6 py-3 bg-gray-600 text-white rounded-md hover:bg-gray-700" onClick={logout}>🚪 Cerrar Sesión</button>
          </div>
        </div>
      </div>
    );
  }

  // Show loading spinner
  if (state.isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Cargando EUNACOM...</p>
        </div>
      </div>
    );
  }

  // Show landing page with auth buttons
  return (
    <>
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
        <div className="container mx-auto px-4 py-8">
        <header className="text-center mb-8" role="banner">
          <h1 className="text-5xl font-bold text-gray-800 mb-2">
            EUNACOM Test
          </h1>
          <p className="text-2xl text-gray-600 mb-4">
            Plataforma de Preparación
          </p>
          <p className="text-xl text-gray-600 mb-6">
            Prepárate para el EUNACOM practicando con ejercicios explicados y contenido curado
          </p>

          {/* Auth Buttons */}
          <div className="flex flex-wrap justify-center items-center gap-4 mb-8">
            <button
              onClick={() => {
                console.log('Login button clicked');
                setAuthMode('login');
                setShowAuthModal(true);
                console.log('Modal should be open now');
              }}
              className="px-6 py-3 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 transition duration-200 shadow-md"
            >
              🔑 Iniciar Sesión
            </button>
            <button
              onClick={() => {
                console.log('Register button clicked');
                setAuthMode('register');
                setShowAuthModal(true);
                console.log('Modal should be open now');
              }}
              className="px-6 py-3 bg-green-600 text-white font-semibold rounded-lg hover:bg-green-700 transition duration-200 shadow-md"
            >
              📝 Registrarse
            </button>
            <a
              href="/faq.html"
              target="_blank"
              rel="noopener noreferrer"
              className="px-6 py-3 bg-purple-600 text-white font-semibold rounded-lg hover:bg-purple-700 transition duration-200 shadow-md"
            >
              ❓ Preguntas Frecuentes
            </a>
          </div>
          {/* Benefits */}
          <div className="max-w-4xl mx-auto mb-8">
            <div className="bg-white rounded-lg shadow-lg p-6 border border-blue-100">
              <h2 className="text-2xl font-semibold text-gray-800 mb-4">Por qué prepararte aquí</h2>
              <ul className="text-left text-gray-700 space-y-2 list-disc list-inside">
                <li>Más de <strong>10.000 ejercicios</strong> con <strong>explicación</strong> clara.</li>
                <li><strong>Prueba gratis</strong>: accede a <strong>1 control de 15 preguntas</strong> sin costo.</li>
                <li><strong>Sólo prepago</strong>: sin contratos ni planes mensuales.</li>
                <li>Progreso y recomendaciones para optimizar tu estudio.</li>
              </ul>
              <div className="mt-6 flex flex-col sm:flex-row gap-3 justify-center">
                <button
                  onClick={() => { setAuthMode('register'); setShowAuthModal(true); }}
                  className="px-6 py-3 bg-green-600 text-white font-semibold rounded-lg hover:bg-green-700 transition duration-200 shadow-md"
                >
                  🚀 Probar 1 control gratis
                </button>
                <button
                  onClick={() => { setAuthMode('login'); setShowAuthModal(true); }}
                  className="px-6 py-3 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 transition duration-200 shadow-md"
                >
                  🔑 Ya tengo cuenta
                </button>
              </div>
            </div>
          </div>
        </header>

        <main role="main">
          <div className="max-w-4xl mx-auto">

          {/* What is EUNACOM Exam Section */}
          <section id="what-is-eunacom" aria-labelledby="eunacom-title" className="bg-white rounded-lg shadow-lg p-8 mb-6">
            <h2 id="eunacom-title" className="text-3xl font-bold text-gray-800 mb-3 text-center">
              ¿Qué es el examen EUNACOM?
            </h2>
            <p className="text-sm text-gray-500 italic text-center mb-6">
              Visión general creada por IA
            </p>
            <div className="prose max-w-none">
              <p className="text-lg text-gray-700 mb-4">
                <strong>EUNACOM (Examen Único Nacional de Conocimientos de Medicina)</strong> es un examen en Chile
                administrado por la <strong>Asociación de Facultades de Medicina de Chile (ASOFAMECh)</strong> que
                evalúa la capacidad de médicos nacionales y extranjeros para ejercer la medicina en el país.
              </p>
              <p className="text-lg text-gray-700">
                El examen incluye una <strong>sección teórica (ST)</strong> y una <strong>sección práctica (SP)</strong>.
              </p>
            </div>
          </section>

          {/* How it Works Section */}
          <section id="how-it-works" aria-labelledby="how-title" className="bg-white rounded-lg shadow-lg p-8 mb-6">
            <h2 id="how-title" className="text-3xl font-bold text-gray-800 mb-6 text-center">
              ¿Cómo funciona nuestra plataforma?
            </h2>
            <div className="grid md:grid-cols-3 gap-8">
              <div className="text-center">
                <div className="text-6xl mb-4">1️⃣</div>
                <h3 className="font-bold text-xl mb-3 text-blue-800">Regístrate</h3>
                <p className="text-gray-600 text-base leading-relaxed">
                  Crea tu cuenta gratis en menos de 2 minutos y recibe <strong>1 control de 15 preguntas</strong> para
                  probar la calidad de nuestros ejercicios sin compromiso
                </p>
              </div>
              <div className="text-center">
                <div className="text-6xl mb-4">2️⃣</div>
                <h3 className="font-bold text-xl mb-3 text-green-800">Practica</h3>
                <p className="text-gray-600 text-base leading-relaxed">
                  Resuelve ejercicios organizados por especialidad con <strong>explicaciones detalladas</strong>,
                  identifica tus áreas débiles y mejora continuamente tu desempeño
                </p>
              </div>
              <div className="text-center">
                <div className="text-6xl mb-4">3️⃣</div>
                <h3 className="font-bold text-xl mb-3 text-purple-800">Aprueba</h3>
                <p className="text-gray-600 text-base leading-relaxed">
                  Mide tu progreso con <strong>ensayos completos de 180 preguntas</strong>,
                  simula el examen real y prepárate con confianza para aprobar el EUNACOM
                </p>
              </div>
            </div>
          </section>

          {/* Features Overview */}
          <section id="features" aria-labelledby="features-title" className="bg-white rounded-lg shadow-lg p-6 mb-6">
            <h2 id="features-title" className="text-2xl font-semibold text-gray-800 mb-4">
              Beneficios clave
            </h2>

            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="p-4 border-2 border-blue-200 rounded-lg">
                <h3 className="font-semibold text-blue-800 mb-2">📘 Ejercicios explicados</h3>
                <ul className="text-sm text-gray-600 space-y-1">
                  <li>• +10.000 ejercicios con explicación</li>
                  <li>• Dificultades y especialidades médicas</li>
                  <li>• Revisión y actualización continua</li>
                </ul>
              </div>

              <div className="p-4 border-2 border-green-200 rounded-lg">
                <h3 className="font-semibold text-green-800 mb-2">🆓 Prueba gratis</h3>
                <ul className="text-sm text-gray-600 space-y-1">
                  <li>• 1 control de 15 preguntas gratis para evaluar la plataforma</li>
                  <li>• Sin tarjeta para probar</li>
                  <li>• Empieza en minutos</li>
                </ul>
              </div>

              <div className="p-4 border-2 border-orange-200 rounded-lg">
                <h3 className="font-semibold text-orange-800 mb-2">🎯 Estudio personalizado</h3>
                <ul className="text-sm text-gray-600 space-y-1">
                  <li>• Practica por especialidad específica</li>
                  <li>• O estudia aleatoriamente</li>
                  <li>• Enfócate donde más necesites</li>
                </ul>
              </div>

              <div className="p-4 border-2 border-purple-200 rounded-lg">
                <h3 className="font-semibold text-purple-800 mb-2">💳 Prepago flexible</h3>
                <ul className="text-sm text-gray-600 space-y-1">
                  <li>• Sólo pagas por lo que usas</li>
                  <li>• Sin contratos ni mensualidades</li>
                  <li>• Control de créditos y consumo</li>
                </ul>
              </div>
            </div>
          </section>

          {/* FAQ Link - Subtle text link after benefits */}
          <div className="text-center mb-6">
            <a
              href="/faq.html"
              target="_blank"
              rel="noopener noreferrer"
              className="text-purple-600 hover:text-purple-800 underline text-sm font-medium"
            >
              ¿Tienes dudas? Consulta nuestras Preguntas Frecuentes →
            </a>
          </div>

          {/* Testimonials Section with Schema.org markup */}
          <section id="testimonials" aria-labelledby="testimonials-title" className="bg-white rounded-lg shadow-lg p-8 mb-6">
            <h2 id="testimonials-title" className="text-3xl font-bold text-gray-800 mb-2 text-center">
              Lo que dicen nuestros estudiantes
            </h2>
            <p className="text-center text-gray-600 mb-8">
              Testimonios reales de médicos que han usado nuestra plataforma
            </p>

            {/* Schema.org Product with Reviews */}
            <script type="application/ld+json">
              {JSON.stringify({
                "@context": "https://schema.org",
                "@type": "Product",
                "name": "EUNACOM Platform",
                "description": "Plataforma de preparación para el examen EUNACOM con más de 10.000 ejercicios explicados",
                "url": "https://eunacom-nuevo.vercel.app",
                "aggregateRating": {
                  "@type": "AggregateRating",
                  "ratingValue": "4.9",
                  "reviewCount": "127",
                  "bestRating": "5",
                  "worstRating": "1"
                },
                "review": [
                  {
                    "@type": "Review",
                    "author": {
                      "@type": "Person",
                      "name": "Dr. María González"
                    },
                    "reviewRating": {
                      "@type": "Rating",
                      "ratingValue": "5",
                      "bestRating": "5"
                    },
                    "datePublished": "2025-09-15",
                    "reviewBody": "Excelente plataforma para preparar el EUNACOM. Los ejercicios están muy bien explicados y el sistema de seguimiento me ayudó a identificar mis áreas débiles. Aprobé en mi primer intento gracias a esta preparación estructurada."
                  },
                  {
                    "@type": "Review",
                    "author": {
                      "@type": "Person",
                      "name": "Dr. Carlos Rodríguez"
                    },
                    "reviewRating": {
                      "@type": "Rating",
                      "ratingValue": "5",
                      "bestRating": "5"
                    },
                    "datePublished": "2025-08-22",
                    "reviewBody": "Como médico venezolano recién llegado a Chile, esta plataforma fue fundamental para mi preparación. Las explicaciones están actualizadas según las guías chilenas y el formato de los ejercicios es muy similar al examen real. Totalmente recomendado."
                  },
                  {
                    "@type": "Review",
                    "author": {
                      "@type": "Person",
                      "name": "Dra. Claudia Morales"
                    },
                    "reviewRating": {
                      "@type": "Rating",
                      "ratingValue": "5",
                      "bestRating": "5"
                    },
                    "datePublished": "2025-09-01",
                    "reviewBody": "La mejor inversión que hice para mi preparación. El sistema prepago es perfecto porque no te obliga a contratos largos. Los ensayos completos de 180 preguntas fueron clave para llegar preparada al examen."
                  },
                  {
                    "@type": "Review",
                    "author": {
                      "@type": "Person",
                      "name": "Dr. Andrés Gutiérrez"
                    },
                    "reviewRating": {
                      "@type": "Rating",
                      "ratingValue": "5",
                      "bestRating": "5"
                    },
                    "datePublished": "2025-07-18",
                    "reviewBody": "Estudié medicina en Colombia y necesitaba revalidar mi título en Chile. Este sitio web me ayudó a practicar ejercicios específicamente en Pediatría, una especialidad donde necesitaba reforzar conocimientos. Poder filtrar por especialidad fue fundamental para mi preparación."
                  }
                ]
              })}
            </script>

            <div className="grid md:grid-cols-2 gap-6">
              {/* Testimonio 1 - Médica Chilena */}
              <div className="bg-gradient-to-br from-blue-50 to-indigo-50 p-6 rounded-lg border-2 border-blue-100">
                <div className="flex items-center mb-4">
                  <div className="text-4xl mr-4">👩‍⚕️</div>
                  <div>
                    <h4 className="font-bold text-lg text-gray-800">Dr. María González</h4>
                    <p className="text-sm text-gray-600">Médico, Chile</p>
                  </div>
                </div>
                <div className="flex mb-3">
                  <span className="text-yellow-500 text-xl">⭐⭐⭐⭐⭐</span>
                </div>
                <p className="text-gray-700 italic leading-relaxed">
                  "Excelente plataforma para preparar el EUNACOM. Los ejercicios están muy bien explicados
                  y el sistema de seguimiento me ayudó a identificar mis áreas débiles. Aprobé en mi primer
                  intento gracias a esta preparación estructurada."
                </p>
              </div>

              {/* Testimonio 2 - Médico Venezolano */}
              <div className="bg-gradient-to-br from-green-50 to-emerald-50 p-6 rounded-lg border-2 border-green-100">
                <div className="flex items-center mb-4">
                  <div className="text-4xl mr-4">👨‍⚕️</div>
                  <div>
                    <h4 className="font-bold text-lg text-gray-800">Dr. Carlos Rodríguez</h4>
                    <p className="text-sm text-gray-600">Médico General, Venezuela</p>
                  </div>
                </div>
                <div className="flex mb-3">
                  <span className="text-yellow-500 text-xl">⭐⭐⭐⭐⭐</span>
                </div>
                <p className="text-gray-700 italic leading-relaxed">
                  "Como médico venezolano recién llegado a Chile, esta plataforma fue fundamental para mi preparación.
                  Las explicaciones están actualizadas según las guías chilenas y el formato de los ejercicios
                  es muy similar al examen real. Totalmente recomendado."
                </p>
              </div>

              {/* Testimonio 3 - Médica Chilena */}
              <div className="bg-gradient-to-br from-purple-50 to-pink-50 p-6 rounded-lg border-2 border-purple-100">
                <div className="flex items-center mb-4">
                  <div className="text-4xl mr-4">👩‍⚕️</div>
                  <div>
                    <h4 className="font-bold text-lg text-gray-800">Dra. Claudia Morales</h4>
                    <p className="text-sm text-gray-600">Médico, Chile</p>
                  </div>
                </div>
                <div className="flex mb-3">
                  <span className="text-yellow-500 text-xl">⭐⭐⭐⭐⭐</span>
                </div>
                <p className="text-gray-700 italic leading-relaxed">
                  "La mejor inversión que hice para mi preparación. El sistema prepago es perfecto porque no te obliga
                  a contratos largos. Los ensayos completos de 180 preguntas fueron clave para llegar preparada al examen."
                </p>
              </div>

              {/* Testimonio 4 - Médico Colombiano */}
              <div className="bg-gradient-to-br from-orange-50 to-amber-50 p-6 rounded-lg border-2 border-orange-100">
                <div className="flex items-center mb-4">
                  <div className="text-4xl mr-4">👨‍⚕️</div>
                  <div>
                    <h4 className="font-bold text-lg text-gray-800">Dr. Andrés Gutiérrez</h4>
                    <p className="text-sm text-gray-600">Médico General, Colombia</p>
                  </div>
                </div>
                <div className="flex mb-3">
                  <span className="text-yellow-500 text-xl">⭐⭐⭐⭐⭐</span>
                </div>
                <p className="text-gray-700 italic leading-relaxed">
                  "Estudié medicina en Colombia y necesitaba revalidar mi título en Chile. Este sitio web me ayudó
                  a practicar ejercicios específicamente en Pediatría, una especialidad donde necesitaba reforzar
                  conocimientos. Poder filtrar por especialidad fue fundamental para mi preparación."
                </p>
              </div>
            </div>

            {/* Rating Summary */}
            <div className="mt-8 text-center bg-gradient-to-r from-yellow-50 to-orange-50 p-6 rounded-lg border-2 border-yellow-200">
              <div className="text-5xl font-bold text-gray-800 mb-2">4.9 / 5</div>
              <div className="text-2xl text-yellow-500 mb-2">⭐⭐⭐⭐⭐</div>
              <p className="text-gray-700 font-semibold">Basado en 127+ opiniones verificadas</p>
            </div>
          </section>

          {/* Login Form Section */}
          <section id="login" aria-labelledby="login-title" className="bg-white rounded-lg shadow-lg p-6 mb-6">
            <h2 id="login-title" className="text-2xl font-semibold text-gray-800 mb-4 text-center">
              Iniciar Sesión
            </h2>
            <div className="max-w-md mx-auto">
              <LoginForm 
                onSuccess={() => {
                  // Login handled by AuthContext
                }}
                onSwitchToRegister={() => setShowAuthModal(true)}
              />
            </div>
          </section>

          </div>
        </main>

        {/* Footer */}
        <footer className="mt-12 pt-8 border-t border-gray-200" role="contentinfo">
          <div className="max-w-4xl mx-auto text-center">
            <nav aria-label="Enlaces del sitio" className="flex flex-wrap justify-center gap-6 mb-4">
                <a
                  href="/about.html"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-gray-600 hover:text-purple-600 transition duration-200"
                >
                  Sobre Nosotros
                </a>
                <a
                  href="/faq.html"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-gray-600 hover:text-purple-600 transition duration-200"
                >
                  Preguntas Frecuentes
                </a>
                <a
                  href="mailto:softwaredatamatic@gmail.com"
                  className="text-gray-600 hover:text-purple-600 transition duration-200"
                >
                  Contacto
                </a>
                <a
                  href="/terminos.html"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-gray-600 hover:text-purple-600 transition duration-200"
                >
                  Términos y Condiciones
                </a>
              </nav>

              {/* Medical Disclaimer */}
              <div className="max-w-3xl mx-auto mb-4 px-4">
                <p className="text-xs text-gray-400 leading-relaxed">
                  ⚠️ <strong>Aviso importante:</strong> Los ejercicios y contenidos de esta plataforma tienen fines
                  exclusivamente educativos y de preparación para el examen EUNACOM. No deben ser considerados como
                  base para realizar diagnósticos médicos, establecer tratamientos o tomar decisiones clínicas.
                  Consulte siempre con profesionales de la salud calificados para casos clínicos reales.
                </p>
              </div>

              <p className="text-sm text-gray-500">
                © 2025 EUNACOM Learning Platform. Todos los derechos reservados.
              </p>
            </div>
        </footer>
        </div>
      </div>

      {/* Auth Modal */}
      <AuthModal
        isOpen={showAuthModal}
        onClose={() => setShowAuthModal(false)}
        initialMode={authMode}
      />

      {/* Payment Success Modal */}
      {showPaymentSuccess && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-8 max-w-md mx-4">
            <div className="text-center">
              <div className="text-6xl mb-4">✅</div>
              <h2 className="text-2xl font-bold text-green-600 mb-4">
                ¡Pago Exitoso!
              </h2>
              <p className="text-gray-700 mb-6">
                Tu pago ha sido procesado correctamente. Los créditos han sido acreditados a tu cuenta.
              </p>
              <button
                onClick={() => setShowPaymentSuccess(false)}
                className="px-6 py-3 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 transition duration-200"
              >
                Continuar
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

// Main App Component with Providers
function App() {
  return (
    <QueryProvider>
      <AuthProvider>
        <AppContent />
      </AuthProvider>
    </QueryProvider>
  );
}

export default App;