import React from 'react';

const API_BASE = import.meta.env.VITE_API_URL || 'https://eunacom-backend-v3.onrender.com';

interface Payment {
  id: string;
  userId: string;
  amount: number;
  credits: number;
  status: string;
  flowOrder: string | null;
  createdAt: string;
  user?: { email: string; firstName: string; lastName: string };
}

interface Props {
  onBack: () => void;
}

export const PaymentsTable: React.FC<Props> = ({ onBack }) => {
  const [payments, setPayments] = React.useState<Payment[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [flowOrderInputs, setFlowOrderInputs] = React.useState<Record<string, string>>({});

  const load = async () => {
    try {
      setLoading(true);
      const res = await fetch(`${API_BASE}/api/admin/payments?limit=50`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('accessToken')}` },
      });
      const data = await res.json();
      if (data.success) setPayments(data.data.payments);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const updateFlowOrder = async (paymentId: string, flowOrder: string) => {
    if (!flowOrder.trim()) {
      alert('Por favor ingresa un flowOrder válido');
      return;
    }
    try {
      const res = await fetch(`${API_BASE}/api/admin/payments/${paymentId}/flowOrder`, {
        method: 'PUT',
        headers: { 
          Authorization: `Bearer ${localStorage.getItem('accessToken')}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ flowOrder: flowOrder.trim() })
      });
      const data = await res.json();
      if (data.success) {
        alert('FlowOrder actualizado exitosamente');
        load();
      } else {
        alert(`Error: ${data.message || 'Error al actualizar flowOrder'}`);
      }
    } catch (e: any) {
      alert(`Error: ${e?.message || 'Error al actualizar flowOrder'}`);
    }
  };

  const checkAndCredit = async (paymentId: string) => {
    if (!confirm('¿Verificar y acreditar este pago?')) return;
    try {
      const res = await fetch(`${API_BASE}/api/payments/flow/check/${paymentId}`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('accessToken')}` },
      });
      const data = await res.json();
      if (data.success && data.credited) {
        alert('Pago acreditado exitosamente');
        load();
      } else if (data.success && data.status === 'PAID') {
        alert('El pago ya estaba acreditado');
        load();
      } else if (data.success) {
        alert(`Estado: ${data.status || 'PENDING'}. ${data.message || ''}`);
      } else {
        alert(`Error: ${data.message || 'Error al verificar pago'}`);
      }
    } catch (e: any) {
      alert(`Error: ${e?.message || 'Error al verificar pago'}`);
    }
  };

  React.useEffect(() => { load(); }, []);

  if (loading) return <div className="p-6">Cargando...</div>;

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-semibold">💳 Pagos</h2>
        <button onClick={onBack} className="px-3 py-2 bg-gray-200 rounded">Volver</button>
      </div>
      <div className="overflow-auto">
        <table className="min-w-full text-sm">
          <thead>
            <tr className="text-left border-b">
              <th className="p-2">Usuario</th>
              <th className="p-2">Monto</th>
              <th className="p-2">Créditos</th>
              <th className="p-2">Estado</th>
              <th className="p-2">FlowOrder</th>
              <th className="p-2">Fecha</th>
              <th className="p-2">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {payments.map(p => (
              <tr key={p.id} className="border-b">
                <td className="p-2">{p.user?.email || p.userId}</td>
                <td className="p-2">${p.amount.toLocaleString()}</td>
                <td className="p-2">{p.credits}</td>
                <td className="p-2">
                  <span className={`px-2 py-1 rounded text-xs ${
                    p.status === 'PAID' ? 'bg-green-100 text-green-800' :
                    p.status === 'PENDING' ? 'bg-yellow-100 text-yellow-800' :
                    'bg-red-100 text-red-800'
                  }`}>
                    {p.status}
                  </span>
                </td>
                <td className="p-2">
                  {p.flowOrder ? (
                    p.flowOrder
                  ) : (
                    <div className="flex gap-1">
                      <input
                        type="text"
                        placeholder="Ingresar flowOrder"
                        value={flowOrderInputs[p.id] || ''}
                        onChange={(e) => setFlowOrderInputs(prev => ({ ...prev, [p.id]: e.target.value }))}
                        className="px-2 py-1 text-xs border rounded w-32"
                      />
                      <button
                        onClick={() => updateFlowOrder(p.id, flowOrderInputs[p.id] || '')}
                        className="px-2 py-1 bg-green-600 text-white rounded text-xs hover:bg-green-700"
                      >
                        ✓
                      </button>
                    </div>
                  )}
                </td>
                <td className="p-2">{new Date(p.createdAt).toLocaleString('es-CL')}</td>
                <td className="p-2">
                  {p.status === 'PENDING' && (
                    <button
                      onClick={() => checkAndCredit(p.id)}
                      className="px-3 py-1 bg-blue-600 text-white rounded text-xs hover:bg-blue-700"
                    >
                      Verificar y acreditar
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default PaymentsTable;

