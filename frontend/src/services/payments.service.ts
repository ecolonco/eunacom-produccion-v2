export class PaymentsService {
  static async createFlowPayment(): Promise<{ url: string; token: string }> {
    const API_BASE = import.meta.env.VITE_API_URL || 'https://eunacom-backend-v3.onrender.com';
    const res = await fetch(`${API_BASE}/api/payments/flow/create`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('accessToken') || ''}`,
      },
    });
    const data = await res.json();
    if (!data.success) throw new Error(data.message || 'No se pudo crear el pago');
    return { url: data.url, token: data.token };
  }
}


