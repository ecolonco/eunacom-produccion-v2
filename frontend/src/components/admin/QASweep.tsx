import React, { useState } from 'react';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'https://eunacom-backend-v3.onrender.com';

interface QASweepProps {}

export const QASweep: React.FC<QASweepProps> = () => {
  const [startId, setStartId] = useState('1');
  const [endId, setEndId] = useState('10');
  const [isRunning, setIsRunning] = useState(false);
  const [results, setResults] = useState<any>(null);
  const [useRealBackend, setUseRealBackend] = useState(false);

  // Debug: Log cuando el componente se renderiza
  console.log('🔍 QASweep component rendered!');

  const handleRunSweep = async () => {
    const mode = useRealBackend ? 'REAL' : 'DEMO';
    console.log(`🚀 Iniciando QA Sweep ${mode}...`, { startId, endId, useRealBackend });
    setIsRunning(true);
    setResults(null); // Limpiar resultados anteriores

    if (useRealBackend) {
      // VERSIÓN REAL - Conectar al backend
      try {
        console.log('🔗 Conectando al backend real...');
        
        const url = `${API_BASE_URL}/api/qa-sweep/run`;
        const token = localStorage.getItem('accessToken');

        console.log('📡 Enviando request a:', url);
        console.log('🔑 Token presente:', !!token);

        const response = await fetch(url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({
            from: startId,
            to: endId,
            apply: false, // Dry run por defecto
            useLLM: true,
            concurrency: 4
          })
        });

        console.log('📥 Response status:', response.status);
        console.log('📥 Response ok:', response.ok);

        if (response.ok) {
          const data = await response.json();
          console.log('✅ QA Sweep REAL exitoso:', data);
          setResults(data);
        } else {
          const errorText = await response.text();
          console.error('❌ Error en QA Sweep REAL:', response.status, errorText);
          setResults({
            error: true,
            message: `Error ${response.status}: ${errorText}`,
            status: response.status,
            real: true
          });
        }
      } catch (error: any) {
        console.error('💥 Error de red en QA Sweep REAL:', error);
        setResults({
          error: true,
          message: `Error de conexión: ${error.message}`,
          networkError: true,
          real: true
        });
      } finally {
        setIsRunning(false);
        console.log('🏁 QA Sweep REAL finalizado');
      }
    } else {
      // VERSIÓN DE DEMOSTRACIÓN - Simular procesamiento
      try {
        console.log('🎭 Ejecutando versión de demostración...');
        
        // Simular delay de procesamiento
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        const range = parseInt(endId) - parseInt(startId) + 1;
        
        // Solo generar resultados para el rango solicitado
        const results = [];
        for (let i = parseInt(startId); i <= parseInt(endId); i++) {
          if (i === parseInt(startId)) {
            results.push({
              id: i.toString(),
              status: "accepted",
              issues: [],
              notes: ["Pregunta cumple todos los estándares de calidad"]
            });
          } else if (i === parseInt(startId) + 1 && i <= parseInt(endId)) {
            results.push({
              id: i.toString(),
              status: "fixed",
              issues: ["Consigna negativa vs medida aconsejable"],
              notes: ["patchNegativeConsignaVerbInversion applied", "Corrección automática aplicada"]
            });
          } else if (i <= parseInt(endId)) {
            results.push({
              id: i.toString(),
              status: "rejected",
              issues: ["Alternativas no plausibles", "Explicación insuficiente"],
              notes: ["Requiere revisión manual"]
            });
          }
        }

        const accepted = results.filter(r => r.status === 'accepted').length;
        const fixed = results.filter(r => r.status === 'fixed').length;
        const rejected = results.filter(r => r.status === 'rejected').length;

        const simulatedResults = {
          range: { from: startId, to: endId },
          apply: false,
          total: results.length,
          accepted,
          fixed,
          rejected,
          results,
          demo: true,
          message: "Resultados simulados para demostración"
        };

        console.log('✅ QA Sweep DEMO exitoso:', simulatedResults);
        setResults(simulatedResults);
        
      } catch (error: any) {
        console.error('💥 Error en demo:', error);
        setResults({
          error: true,
          message: `Error en demostración: ${error.message}`,
          demo: true
        });
      } finally {
        setIsRunning(false);
        console.log('🏁 QA Sweep DEMO finalizado');
      }
    }
  };

  return (
    <div style={{
      backgroundColor: '#fff3cd',
      border: '3px solid #ffc107',
      borderRadius: '12px',
      padding: '30px',
      margin: '20px 0',
      boxShadow: '0 4px 12px rgba(255, 193, 7, 0.3)',
      minHeight: '200px'
    }}>
      <h3 style={{ marginTop: 0, color: '#495057' }}>🔍 QA Sweep - Control de Calidad</h3>
      
      <div style={{
        backgroundColor: '#d1ecf1',
        border: '1px solid #bee5eb',
        borderRadius: '4px',
        padding: '10px',
        marginBottom: '20px',
        fontSize: '14px',
        color: '#0c5460'
      }}>
        ✅ <strong>Componente QA Sweep cargado correctamente!</strong> Si ves este mensaje, el componente se está renderizando.
      </div>
      
      <div style={{ marginBottom: '20px' }}>
        <label style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '15px' }}>
          <input
            type="checkbox"
            checked={useRealBackend}
            onChange={(e) => setUseRealBackend(e.target.checked)}
            style={{ transform: 'scale(1.2)' }}
          />
          <span style={{ fontWeight: 'bold', color: useRealBackend ? '#dc3545' : '#28a745' }}>
            {useRealBackend ? '🔗 Usar Backend Real' : '🎭 Modo Demostración'}
          </span>
        </label>
        
        {useRealBackend && (
          <div style={{
            backgroundColor: '#fff3cd',
            border: '1px solid #ffc107',
            borderRadius: '4px',
            padding: '10px',
            fontSize: '14px',
            color: '#856404'
          }}>
            ⚠️ <strong>Modo Real:</strong> Se conectará al backend y procesará ejercicios reales de la base de datos.
          </div>
        )}
      </div>

      <div style={{ display: 'flex', gap: '15px', alignItems: 'center', marginBottom: '20px' }}>
        <div>
          <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
            ID Inicial:
          </label>
          <input
            type="number"
            value={startId}
            onChange={(e) => setStartId(e.target.value)}
            style={{
              padding: '8px',
              border: '1px solid #ced4da',
              borderRadius: '4px',
              width: '80px'
            }}
          />
        </div>
        
        <div>
          <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
            ID Final:
          </label>
          <input
            type="number"
            value={endId}
            onChange={(e) => setEndId(e.target.value)}
            style={{
              padding: '8px',
              border: '1px solid #ced4da',
              borderRadius: '4px',
              width: '80px'
            }}
          />
        </div>
        
        <button
          onClick={handleRunSweep}
          disabled={isRunning}
          style={{
            padding: '10px 20px',
            backgroundColor: isRunning ? '#6c757d' : '#007bff',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: isRunning ? 'not-allowed' : 'pointer',
            marginTop: '20px'
          }}
        >
          {isRunning ? '🔄 Procesando...' : '▶️ Ejecutar QA Sweep'}
        </button>
      </div>

      {results && (
        <div style={{
          backgroundColor: results.error ? '#f8d7da' : '#d4edda',
          border: `2px solid ${results.error ? '#dc3545' : '#28a745'}`,
          borderRadius: '8px',
          padding: '20px',
          marginTop: '20px'
        }}>
          {results.error ? (
            <>
              <h4 style={{ color: '#721c24', marginTop: 0 }}>❌ Error en QA Sweep</h4>
              <p style={{ color: '#721c24', fontWeight: 'bold' }}>
                {results.message}
              </p>
              {results.networkError && (
                <div style={{ 
                  backgroundColor: '#fff3cd', 
                  border: '1px solid #ffeaa7',
                  borderRadius: '4px',
                  padding: '10px',
                  marginTop: '10px',
                  fontSize: '14px'
                }}>
                  <strong>💡 Posibles causas:</strong>
                  <ul style={{ margin: '5px 0', paddingLeft: '20px' }}>
                    <li>El backend no está disponible</li>
                    <li>El endpoint /api/qa-sweep/run no existe</li>
                    <li>Problema de CORS entre Vercel y Render</li>
                    <li>Falta autenticación (token JWT)</li>
                  </ul>
                </div>
              )}
            </>
          ) : (
            <>
              <h4 style={{ color: '#155724', marginTop: 0 }}>
                📊 Resultados del QA Sweep {results.demo ? '(DEMO)' : ''}:
              </h4>
              
              {results.demo && (
                <div style={{
                  backgroundColor: '#fff3cd',
                  border: '1px solid #ffc107',
                  borderRadius: '4px',
                  padding: '10px',
                  marginBottom: '15px',
                  fontSize: '14px'
                }}>
                  🎭 <strong>Versión de demostración:</strong> {results.message}
                </div>
              )}

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '15px', marginBottom: '20px' }}>
                <div style={{ textAlign: 'center', padding: '10px', backgroundColor: '#e9ecef', borderRadius: '8px' }}>
                  <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#495057' }}>{results.total}</div>
                  <div style={{ fontSize: '12px', color: '#6c757d' }}>Total</div>
                </div>
                <div style={{ textAlign: 'center', padding: '10px', backgroundColor: '#d4edda', borderRadius: '8px' }}>
                  <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#155724' }}>{results.accepted}</div>
                  <div style={{ fontSize: '12px', color: '#155724' }}>Aceptados</div>
                </div>
                <div style={{ textAlign: 'center', padding: '10px', backgroundColor: '#fff3cd', borderRadius: '8px' }}>
                  <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#856404' }}>{results.fixed}</div>
                  <div style={{ fontSize: '12px', color: '#856404' }}>Corregidos</div>
                </div>
                <div style={{ textAlign: 'center', padding: '10px', backgroundColor: '#f8d7da', borderRadius: '8px' }}>
                  <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#721c24' }}>{results.rejected}</div>
                  <div style={{ fontSize: '12px', color: '#721c24' }}>Rechazados</div>
                </div>
              </div>

              {results.results && results.results.length > 0 && (
                <>
                  <h5 style={{ color: '#495057', marginBottom: '10px' }}>🔍 Detalles por ejercicio:</h5>
                  {results.results.map((result: any, index: number) => (
                    <div key={index} style={{
                      backgroundColor: result.status === 'accepted' ? '#d4edda' : 
                                     result.status === 'fixed' ? '#fff3cd' : '#f8d7da',
                      border: `1px solid ${result.status === 'accepted' ? '#c3e6cb' : 
                                          result.status === 'fixed' ? '#ffeaa7' : '#f5c6cb'}`,
                      borderRadius: '6px',
                      padding: '12px',
                      marginBottom: '10px'
                    }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                        <strong>Ejercicio #{result.id}</strong>
                        <span style={{
                          padding: '4px 8px',
                          borderRadius: '12px',
                          fontSize: '12px',
                          fontWeight: 'bold',
                          backgroundColor: result.status === 'accepted' ? '#28a745' : 
                                          result.status === 'fixed' ? '#ffc107' : '#dc3545',
                          color: 'white'
                        }}>
                          {result.status === 'accepted' ? '✅ ACEPTADO' : 
                           result.status === 'fixed' ? '🔧 CORREGIDO' : '❌ RECHAZADO'}
                        </span>
                      </div>
                      
                      {result.issues && result.issues.length > 0 && (
                        <div style={{ marginBottom: '8px' }}>
                          <strong style={{ fontSize: '14px', color: '#495057' }}>Problemas detectados:</strong>
                          <ul style={{ margin: '4px 0', paddingLeft: '20px', fontSize: '13px' }}>
                            {result.issues.map((issue: string, i: number) => (
                              <li key={i} style={{ color: '#721c24' }}>{issue}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                      
                      {result.notes && result.notes.length > 0 && (
                        <div>
                          <strong style={{ fontSize: '14px', color: '#495057' }}>Notas:</strong>
                          <ul style={{ margin: '4px 0', paddingLeft: '20px', fontSize: '13px' }}>
                            {result.notes.map((note: string, i: number) => (
                              <li key={i} style={{ color: '#495057' }}>{note}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  ))}
                </>
              )}
            </>
          )}
        </div>
      )}
      
      <div style={{
        marginTop: '15px',
        padding: '10px',
        backgroundColor: '#e7f3ff',
        border: '1px solid #b3d9ff',
        borderRadius: '4px',
        fontSize: '14px'
      }}>
        <strong>ℹ️ Información:</strong> Esta herramienta ejecuta un análisis de calidad en lote sobre los ejercicios generados, aplicando heurísticas y verificación con IA.
      </div>
    </div>
  );
};

export default QASweep;
