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
      } else {
        alert(`Estado: ${data.status || 'PENDING'}`);
      }
    } catch (e: any) {
      alert(e?.message || 'Error al verificar pago');
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
                <td className="p-2">{p.flowOrder || '-'}</td>
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

