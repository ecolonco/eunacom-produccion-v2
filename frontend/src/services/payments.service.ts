export class PaymentsService {
  static async createFlowPayment(): Promise<{ url: string; token: string; paymentId: string }> {
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
    // Guardar paymentId para verificar después
    const paymentId = data.paymentId || '';
    return { url: data.url, token: data.token, paymentId };
  }

  static async checkPaymentStatus(paymentId: string): Promise<{ status: string; credited?: boolean }> {
    const API_BASE = import.meta.env.VITE_API_URL || 'https://eunacom-backend-v3.onrender.com';
    const res = await fetch(`${API_BASE}/api/payments/flow/check/${paymentId}`, {
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('accessToken') || ''}`,
      },
    });
    const data = await res.json();
    if (!data.success) throw new Error(data.message || 'Error al verificar pago');
    return { status: data.status, credited: data.credited };
  }
}
