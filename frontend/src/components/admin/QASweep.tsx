import React, { useState, useMemo } from 'react';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'https://eunacom-backend-v3.onrender.com';

type QATab = 'run' | 'history';

interface QASweepProps {
  defaultTab?: QATab;
}

interface QARunSummary {
  success: boolean;
  runId: string;
  range: { from: number; to: number };
  apply: boolean;
  useLLM: boolean;
  concurrency: number;
  total: number;
  accepted: number;
  fixed: number;
  rejected: number;
}

interface QARunListItem {
  id: string;
  startedAt: string;
  finishedAt?: string | null;
  status: string;
  summary?: any;
  params?: any;
}

interface QAResultItem {
  id: string;
  baseId: string;
  variationId: string;
  stage: string;
  labels: string[];
  scores?: Record<string, number> | null;
  critique?: string | null;
  patch?: any;
  riskLevel?: string | null;
  applied: boolean;
  createdAt: string;
  variation: {
    baseId: string;
    variationId: string;
    sequenceNumber: number | null;
    variationNumber: number;
    baseContent: string;
    stem: string;
    difficulty: string | null;
    explanation: string | null;
    options: Array<{ id: string; text: string; isCorrect: boolean; order: number; explanation: string | null }>;
  } | null;
}

const STAGE_OPTIONS = [
  { value: 'PRECHECK', label: 'Prechecks' },
  { value: 'LLM_EVAL', label: 'Evaluación IA' },
  { value: 'LLM_FIX', label: 'Fix IA' },
  { value: 'ALL', label: 'Todos' }
] as const;

type StageFilter = typeof STAGE_OPTIONS[number]['value'];

export const QASweep: React.FC<QASweepProps> = ({ defaultTab = 'run' }) => {
  const [startId, setStartId] = useState('1');
  const [endId, setEndId] = useState('10');
  const [useRealBackend, setUseRealBackend] = useState(false);
  const [isRunning, setIsRunning] = useState(false);
  const [runSummary, setRunSummary] = useState<QARunSummary | null>(null);
  const [runId, setRunId] = useState<string | null>(null);
  const [stageFilter, setStageFilter] = useState<StageFilter>('PRECHECK');
  const [labelFilter, setLabelFilter] = useState('');
  const [loadingResults, setLoadingResults] = useState(false);
  const [resultItems, setResultItems] = useState<QAResultItem[]>([]);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<QATab>(defaultTab);
  const [runHistory, setRunHistory] = useState<QARunListItem[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  console.log('🔍 QASweep component rendered!');

  const filteredResults = useMemo(() => {
    let filtered = resultItems;

    // 1. Excluir automáticamente "pregunta_larga"
    filtered = filtered.filter((item) =>
      !(item.labels || []).includes('pregunta_larga')
    );

    // 2. Mostrar solo los que tienen problemas (excluir OK puros)
    filtered = filtered.filter((item) => {
      const labels = item.labels || [];
      // Si solo tiene "ok" o está vacío, no mostrarlo
      if (labels.length === 0) return false;
      if (labels.length === 1 && labels[0] === 'ok') return false;
      return true;
    });

    // 3. Filtro de búsqueda por texto
    if (labelFilter.trim()) {
      const query = labelFilter.toLowerCase();
      filtered = filtered.filter((item) =>
        (item.labels || []).some((label) => label.toLowerCase().includes(query)) ||
        (item.critique ?? '').toLowerCase().includes(query)
      );
    }

    return filtered;
  }, [labelFilter, resultItems]);

  const fetchRunHistory = async () => {
    try {
      setLoadingHistory(true);
      const token = localStorage.getItem('accessToken');
      if (!token) throw new Error('Token de autenticación no disponible');
      const response = await fetch(`${API_BASE_URL}/api/qa-sweep/runs?limit=50`, {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        }
      });
      if (!response.ok) {
        const text = await response.text();
        throw new Error(text || 'No se pudo obtener historial');
      }
      const data = await response.json();
      setRunHistory((data.runs || []) as QARunListItem[]);
    } catch (error: any) {
      console.error('Error fetching run history:', error);
      setErrorMessage(error.message || 'Error al cargar historial');
      setRunHistory([]);
    } finally {
      setLoadingHistory(false);
    }
  };

  const fetchRunSummaryById = async (id: string): Promise<QARunSummary | null> => {
    try {
      const token = localStorage.getItem('accessToken');
      if (!token) throw new Error('Token de autenticación no disponible');
      const response = await fetch(`${API_BASE_URL}/api/qa-sweep/run/${id}`, {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        }
      });
      if (!response.ok) {
        const text = await response.text();
        throw new Error(text || 'No se pudo obtener información del run');
      }
      const data = await response.json();
      const run = data.run;
      const params = (run?.params ?? {}) as Record<string, any>;
      const summary = (run?.summary ?? {}) as Record<string, any>;
      return {
        success: true,
        runId: run.id,
        range: {
          from: Number(params.from ?? 0),
          to: Number(params.to ?? 0)
        },
        apply: Boolean(params.apply),
        useLLM: params.useLLM !== false,
        concurrency: Number(params.concurrency ?? 4),
        total: Number(summary.total ?? 0),
        accepted: Number(summary.accepted ?? 0),
        fixed: Number(summary.fixed ?? 0),
        rejected: Number(summary.rejected ?? 0)
      };
    } catch (error: any) {
      console.error('Error fetching run summary:', error);
      setErrorMessage(error.message || 'Error al obtener información del run');
      return null;
    }
  };

  const fetchRunResults = async (id: string, stage: StageFilter) => {
    try {
      setLoadingResults(true);
      setErrorMessage(null);
      const token = localStorage.getItem('accessToken');
      if (!token) throw new Error('Token de autenticación no disponible');

      const stageParam = stage === 'ALL' ? '' : `stage=${stage}`;
      const url = `${API_BASE_URL}/api/qa-sweep/run/${id}/results${stageParam ? `?${stageParam}` : ''}`;
      const response = await fetch(url, {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        const text = await response.text();
        throw new Error(text || 'No se pudo obtener resultados');
      }

      const data = await response.json();
      const rawResults = (data.results || []) as QAResultItem[];
      const visibleResults = rawResults.filter((item) => {
        const labels = item.labels || [];
        const hasNonOkLabels = labels.some((label) => label.toLowerCase() !== 'ok');
        const critique = (item.critique || '').toLowerCase();
        const normalizedCritique = critique.trim();
        const passesHeuristicNote = critique.includes('pasa precheck heurístico');
        const isPrecheckStage = item.stage === 'PRECHECK';
        const hasRelevantCritique = normalizedCritique.length > 0 && normalizedCritique !== 'ok' && !passesHeuristicNote;

        if (hasNonOkLabels) {
          return true;
        }

        if (isPrecheckStage) {
          return false;
        }

        if (labels.length > 0) {
          return false;
        }

        return hasRelevantCritique;
      });
      setResultItems(visibleResults);
    } catch (error: any) {
      console.error('Error fetching QA results:', error);
      setErrorMessage(error.message || 'Error al cargar los resultados');
      setResultItems([]);
    } finally {
      setLoadingResults(false);
    }
  };

  const handleRunSweep = async () => {
    const mode = useRealBackend ? 'REAL' : 'DEMO';
    console.log(`🚀 Iniciando QA Sweep ${mode}...`, { startId, endId, useRealBackend });

    setIsRunning(true);
    setRunSummary(null);
    setRunId(null);
    setResultItems([]);
    setErrorMessage(null);

    if (!useRealBackend) {
      try {
        await new Promise((resolve) => setTimeout(resolve, 2000));
        const from = parseInt(startId, 10);
        const to = parseInt(endId, 10);
        const total = to - from + 1;
        const demoSummary: QARunSummary = {
          success: true,
          runId: 'demo-run',
          range: { from, to },
          apply: false,
          useLLM: false,
          concurrency: 4,
          total,
          accepted: Math.max(0, Math.floor(total / 4)),
          fixed: Math.max(0, Math.floor(total / 6)),
          rejected: Math.max(0, total - Math.floor(total / 4) - Math.floor(total / 6))
        };
        setRunSummary(demoSummary);
        setRunId(demoSummary.runId);
        setResultItems([]);
      } catch (error: any) {
        setErrorMessage(error.message || 'Error en la simulación');
      } finally {
        setIsRunning(false);
      }
      return;
    }

    try {
      const token = localStorage.getItem('accessToken');
      if (!token) {
        throw new Error('Token de autenticación no disponible');
      }

      const response = await fetch(`${API_BASE_URL}/api/qa-sweep/run`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          from: Number(startId),
          to: Number(endId),
          apply: false,
          useLLM: true,
          concurrency: 4
        })
      });

      if (!response.ok) {
        const text = await response.text();
        throw new Error(text || `Error ${response.status}`);
      }

      const data: QARunSummary = await response.json();
      setRunSummary(data);
      setRunId(data.runId);
      await fetchRunResults(data.runId, stageFilter);
    } catch (error: any) {
      console.error('QA Sweep error:', error);
      setErrorMessage(error.message || 'Error al ejecutar QA Sweep');
    } finally {
      setIsRunning(false);
    }
  };

  const handleStageChange = async (value: StageFilter) => {
    setStageFilter(value);
    if (runId) {
      await fetchRunResults(runId, value);
    }
  };

  const handleTabChange = async (tab: QATab) => {
    setActiveTab(tab);
    if (tab === 'history') {
      await fetchRunHistory();
    }
  };

  React.useEffect(() => {
    setActiveTab(defaultTab);
  }, [defaultTab]);

  React.useEffect(() => {
    if (defaultTab === 'history') {
      fetchRunHistory();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div style={{
      backgroundColor: '#fff3cd',
      border: '3px solid #ffc107',
      borderRadius: '12px',
      padding: '30px',
      margin: '20px 0',
      boxShadow: '0 4px 12px rgba(255, 193, 7, 0.3)'
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
        ✅ <strong>Componente QA Sweep cargado correctamente.</strong>
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
            ⚠️ <strong>Modo real:</strong> se conectará al backend y procesará ejercicios reales.
          </div>
        )}
      </div>

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '15px', marginBottom: '20px' }}>
        <div>
          <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>ID Inicial:</label>
          <input
            type="number"
            value={startId}
            onChange={(e) => setStartId(e.target.value)}
            style={{ padding: '8px', border: '1px solid #ced4da', borderRadius: '4px', width: '100px' }}
          />
        </div>
        <div>
          <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>ID Final:</label>
          <input
            type="number"
            value={endId}
            onChange={(e) => setEndId(e.target.value)}
            style={{ padding: '8px', border: '1px solid #ced4da', borderRadius: '4px', width: '100px' }}
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
            marginTop: '24px'
          }}
        >
          {isRunning ? '🔄 Procesando...' : '▶️ Ejecutar QA Sweep'}
        </button>
      </div>

      {errorMessage && (
        <div style={{
          backgroundColor: '#f8d7da',
          border: '1px solid #f5c6cb',
          color: '#721c24',
          padding: '12px',
          borderRadius: '6px',
          marginBottom: '20px'
        }}>
          ❌ {errorMessage}
        </div>
      )}

      <div style={{ display: 'flex', gap: '10px', marginBottom: '20px' }}>
        <button
          onClick={() => handleTabChange('run')}
          style={{
            padding: '10px 16px',
            borderRadius: '6px',
            border: activeTab === 'run' ? '2px solid #007bff' : '1px solid #ced4da',
            backgroundColor: activeTab === 'run' ? '#e7f1ff' : '#ffffff',
            color: '#007bff',
            fontWeight: activeTab === 'run' ? 'bold' : 'normal',
            cursor: 'pointer'
          }}
        >
          🚀 Ejecutar Sweep
        </button>
        <button
          onClick={() => handleTabChange('history')}
          style={{
            padding: '10px 16px',
            borderRadius: '6px',
            border: activeTab === 'history' ? '2px solid #17a2b8' : '1px solid #ced4da',
            backgroundColor: activeTab === 'history' ? '#e8fbff' : '#ffffff',
            color: '#17a2b8',
            fontWeight: activeTab === 'history' ? 'bold' : 'normal',
            cursor: 'pointer'
          }}
        >
          📊 Historial QA
        </button>
      </div>

      {runSummary && (
        <div style={{
          backgroundColor: '#d4edda',
          border: '2px solid #28a745',
          borderRadius: '8px',
          padding: '20px',
          marginBottom: '20px'
        }}>
          <h4 style={{ color: '#155724', marginTop: 0 }}>📊 Resumen del QA Sweep</h4>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(120px, 1fr))', gap: '15px', marginBottom: '15px' }}>
            <SummaryCard title="Total" value={runSummary.total} color="#495057" background="#e9ecef" />
            <SummaryCard title="Aceptados" value={runSummary.accepted} color="#155724" background="#d4edda" />
            <SummaryCard title="Corregidos" value={runSummary.fixed} color="#856404" background="#fff3cd" />
            <SummaryCard title="Rechazados" value={runSummary.rejected} color="#721c24" background="#f8d7da" />
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '15px', fontSize: '14px', color: '#495057' }}>
            <div>Run ID: <strong>{runSummary.runId}</strong></div>
            <div>Rango: <strong>{runSummary.range.from} - {runSummary.range.to}</strong></div>
            <div>LLM: <strong>{runSummary.useLLM ? 'Sí' : 'No'}</strong></div>
            <div>Concurrencia: <strong>{runSummary.concurrency}</strong></div>
          </div>
        </div>
      )}

      {activeTab === 'history' && (
        <div style={{
          backgroundColor: '#ffffff',
          border: '1px solid #dee2e6',
          borderRadius: '8px',
          padding: '20px',
          marginBottom: '20px'
        }}>
          <h4 style={{ marginTop: 0, color: '#343a40' }}>🗂 Corridas recientes</h4>
          {loadingHistory ? (
            <div style={{ textAlign: 'center', padding: '20px', color: '#6c757d' }}>Cargando historial...</div>
          ) : runHistory.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '20px', color: '#6c757d' }}>No hay corridas registradas.</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {runHistory.map((run) => (
                <div key={run.id} style={{
                  border: '1px solid #ced4da',
                  borderRadius: '6px',
                  padding: '12px',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  flexWrap: 'wrap',
                  gap: '10px'
                }}>
                  <div>
                    <div style={{ fontWeight: 'bold', color: '#343a40' }}>Run ID: {run.id}</div>
                    <div style={{ fontSize: '13px', color: '#6c757d' }}>
                      {new Date(run.startedAt).toLocaleString()} • Estado: {run.status}
                    </div>
                      <div style={{ fontSize: '13px', color: '#6c757d' }}>
                        Total: {run.summary?.total ?? '-'} • Aceptados: {run.summary?.accepted ?? '-'} • Rechazados: {run.summary?.rejected ?? '-'}
                      </div>
                    </div>
                    <button
                      onClick={async () => {
                        const summary = await fetchRunSummaryById(run.id);
                        if (summary) {
                          setRunSummary(summary);
                          setRunId(run.id);
                          await fetchRunResults(run.id, stageFilter);
                        }
                      }}
                    style={{ padding: '6px 10px', borderRadius: '4px', border: '1px solid #28a745', color: '#28a745', background: 'white', cursor: 'pointer' }}
                  >
                    Ver detalles
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {runId && (
        <div style={{
          backgroundColor: '#ffffff',
          border: '1px solid #dee2e6',
          borderRadius: '8px',
          padding: '20px'
        }}>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', marginBottom: '15px', alignItems: 'center' }}>
            <h4 style={{ margin: 0, color: '#343a40' }}>🔎 Hallazgos por variación</h4>
            <select
              value={stageFilter}
              onChange={(e) => handleStageChange(e.target.value as StageFilter)}
              disabled={loadingResults}
              style={{ padding: '6px 10px', borderRadius: '4px', border: '1px solid #ced4da' }}
            >
              {STAGE_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>{option.label}</option>
              ))}
            </select>
            <input
              type="text"
              placeholder="Filtrar por etiqueta o nota"
              value={labelFilter}
              onChange={(e) => setLabelFilter(e.target.value)}
              style={{
                flex: 1,
                minWidth: '220px',
                padding: '6px 10px',
                borderRadius: '4px',
                border: '1px solid #ced4da'
              }}
            />
            <button
              onClick={() => runId && fetchRunResults(runId, stageFilter)}
              disabled={loadingResults}
              style={{ padding: '6px 12px', borderRadius: '4px', border: '1px solid #17a2b8', color: '#17a2b8', background: 'white' }}
            >
              🔁 Actualizar
            </button>
          </div>

          {loadingResults ? (
            <div style={{ textAlign: 'center', padding: '30px', color: '#6c757d' }}>Cargando resultados...</div>
          ) : filteredResults.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '30px', color: '#6c757d' }}>Sin resultados para los filtros seleccionados.</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
              {filteredResults.map((result) => (
                <QAResultCard key={result.id} result={result} />
              ))}
            </div>
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
        <strong>ℹ️ Información:</strong> Esta herramienta ejecuta un análisis de calidad en lote sobre los ejercicios generados, aplicando heurísticas y (próximamente) validación con IA.
      </div>
    </div>
  );
};

interface SummaryCardProps {
  title: string;
  value: number;
  color: string;
  background: string;
}

const SummaryCard: React.FC<SummaryCardProps> = ({ title, value, color, background }) => (
  <div style={{ textAlign: 'center', padding: '12px', backgroundColor: background, borderRadius: '8px' }}>
    <div style={{ fontSize: '26px', fontWeight: 'bold', color }}>{value}</div>
    <div style={{ fontSize: '13px', color }}>{title}</div>
  </div>
);

const QAResultCard: React.FC<{ result: QAResultItem }> = ({ result }) => {
  const hasIssues = (result.labels || []).length > 0;
  const chipColor = hasIssues ? '#dc3545' : '#28a745';
  const chipBg = hasIssues ? '#f8d7da' : '#d4edda';
  const exerciseNumber = result.variation?.sequenceNumber ?? null;
  const variationNumber = result.variation?.variationNumber ?? null;

  return (
    <div style={{
      border: `1px solid ${chipColor}`,
      backgroundColor: chipBg,
      borderRadius: '8px',
      padding: '15px'
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
        <div>
          <strong>Ejercicio:</strong> {exerciseNumber ?? '—'}
          {' · '}
          <strong>Variación:</strong> {variationNumber ?? '—'}
        </div>
        <span style={{
          backgroundColor: chipColor,
          color: 'white',
          padding: '4px 10px',
          borderRadius: '12px',
          fontSize: '12px',
          fontWeight: 'bold'
        }}>
          {hasIssues ? 'Revisión requerida' : 'OK'}
        </span>
      </div>

      {result.labels?.length > 0 && (
        <div style={{ marginTop: '10px' }}>
          <strong>Etiquetas:</strong>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginTop: '6px' }}>
            {result.labels.map((label) => (
              <span key={label} style={{ padding: '4px 8px', backgroundColor: '#fff', borderRadius: '12px', fontSize: '12px', color: '#721c24', border: '1px solid #f5c6cb' }}>{label}</span>
            ))}
          </div>
        </div>
      )}

      {result.critique && (
        <div style={{ marginTop: '10px', fontSize: '13px', color: '#495057' }}>
          <strong>Notas:</strong> {result.critique}
        </div>
      )}

      {result.variation && (
        <div style={{ marginTop: '12px', backgroundColor: '#ffffff', borderRadius: '6px', padding: '12px', border: '1px solid #ced4da' }}>
          <div style={{ marginBottom: '8px', fontWeight: 'bold', color: '#343a40' }}>Enunciado:</div>
          <div style={{ marginBottom: '12px', lineHeight: 1.5 }}>{result.variation.stem}</div>

          <div style={{ marginBottom: '8px', fontWeight: 'bold', color: '#343a40' }}>Alternativas:</div>
          <ul style={{ margin: 0, paddingLeft: '0', listStyle: 'none' }}>
            {result.variation.options.map((option, index) => {
              const letter = String.fromCharCode(65 + index);
              return (
                <li key={option.id} style={{ display: 'flex', gap: '10px', marginBottom: '6px', color: option.isCorrect ? '#155724' : '#495057' }}>
                  <span style={{ fontWeight: 'bold', minWidth: '20px' }}>{letter}.</span>
                  <div>
                    <span style={{ fontWeight: option.isCorrect ? 'bold' : 'normal' }}>
                      {option.text} {option.isCorrect ? '✅' : ''}
                    </span>
                    {option.explanation && (
                      <div style={{ fontSize: '12px', marginTop: '4px', color: option.isCorrect ? '#155724' : '#6c757d' }}>
                        {option.explanation}
                      </div>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>

          {result.variation.explanation && (
            <div style={{ marginTop: '12px' }}>
              <strong>Explicación global:</strong>
              <div style={{ marginTop: '4px', fontSize: '13px', color: '#495057' }}>{result.variation.explanation}</div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default QASweep;
