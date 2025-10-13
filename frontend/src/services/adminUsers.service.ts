export interface ControlPurchaseDto {
  id: string;
  controlsTotal: number;
  controlsUsed: number;
  package: {
    name: string;
  };
}

export interface ExamPurchaseDto {
  id: string;
  examsTotal: number;
  examsUsed: number;
  package: {
    name: string;
  };
}

export interface MockExamPurchaseDto {
  id: string;
  mockExamsTotal: number;
  mockExamsUsed: number;
  package: {
    name: string;
  };
}

export interface AdminUserDto {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  username?: string;
  role: string;
  credits: number;
  isActive: boolean;
  isVerified: boolean;
  createdAt: string;
  controlPurchases?: ControlPurchaseDto[];
  examPurchases?: ExamPurchaseDto[];
  mockExamPurchases?: MockExamPurchaseDto[];
}

export class AdminUsersService {
  static async listUsers(params?: { page?: number; limit?: number; search?: string }): Promise<{
    users: AdminUserDto[];
    total: number;
    page: number;
    limit: number;
  }> {
    const query = new URLSearchParams();
    if (params?.page) query.append('page', String(params.page));
    if (params?.limit) query.append('limit', String(params.limit));
    if (params?.search) query.append('search', params.search);

    const res = await fetch(`${import.meta.env.VITE_API_URL || 'https://eunacom-backend-v3.onrender.com'}/api/admin/users?${query.toString()}`, {
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${localStorage.getItem('accessToken') || ''}`,
      },
    });
    const data = await res.json();
    if (!data.success) throw new Error(data.message || 'Error al obtener usuarios');
    return data.data;
  }

  static async updateUser(id: string, payload: Partial<{ email: string; firstName: string; lastName: string; username: string; password: string; credits: number; isActive: boolean; isVerified: boolean }>): Promise<AdminUserDto> {
    const res = await fetch(`${import.meta.env.VITE_API_URL || 'https://eunacom-backend-v3.onrender.com'}/api/admin/users/${id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${localStorage.getItem('accessToken') || ''}`,
      },
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    if (!data.success) throw new Error(data.message || 'Error al actualizar usuario');
    return data.data.user as AdminUserDto;
  }

  static async updateControlPurchase(userId: string, purchaseId: string, controlsUsed: number): Promise<void> {
    const res = await fetch(`${import.meta.env.VITE_API_URL || 'https://eunacom-backend-v3.onrender.com'}/api/admin/users/${userId}/control-purchases/${purchaseId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${localStorage.getItem('accessToken') || ''}`,
      },
      body: JSON.stringify({ controlsUsed }),
    });
    const data = await res.json();
    if (!data.success) throw new Error(data.message || 'Error al actualizar compra');
  }

  static async updateExamPurchase(userId: string, purchaseId: string, examsUsed: number): Promise<void> {
    const res = await fetch(`${import.meta.env.VITE_API_URL || 'https://eunacom-backend-v3.onrender.com'}/api/admin/users/${userId}/exam-purchases/${purchaseId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${localStorage.getItem('accessToken') || ''}`,
      },
      body: JSON.stringify({ examsUsed }),
    });
    const data = await res.json();
    if (!data.success) throw new Error(data.message || 'Error al actualizar compra');
  }

  static async updateMockExamPurchase(userId: string, purchaseId: string, mockExamsUsed: number): Promise<void> {
    const res = await fetch(`${import.meta.env.VITE_API_URL || 'https://eunacom-backend-v3.onrender.com'}/api/admin/users/${userId}/mock-exam-purchases/${purchaseId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${localStorage.getItem('accessToken') || ''}`,
      },
      body: JSON.stringify({ mockExamsUsed }),
    });
    const data = await res.json();
    if (!data.success) throw new Error(data.message || 'Error al actualizar compra');
  }

  static async createControlPurchase(userId: string, packageId: string): Promise<void> {
    const res = await fetch(`${import.meta.env.VITE_API_URL || 'https://eunacom-backend-v3.onrender.com'}/api/admin/users/${userId}/control-purchases`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${localStorage.getItem('accessToken') || ''}`,
      },
      body: JSON.stringify({ packageId }),
    });
    const data = await res.json();
    if (!data.success) throw new Error(data.message || 'Error al crear compra');
  }

  static async createExamPurchase(userId: string, packageId: string): Promise<void> {
    const res = await fetch(`${import.meta.env.VITE_API_URL || 'https://eunacom-backend-v3.onrender.com'}/api/admin/users/${userId}/exam-purchases`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${localStorage.getItem('accessToken') || ''}`,
      },
      body: JSON.stringify({ packageId }),
    });
    const data = await res.json();
    if (!data.success) throw new Error(data.message || 'Error al crear compra');
  }

  static async createMockExamPurchase(userId: string, packageId: string): Promise<void> {
    const res = await fetch(`${import.meta.env.VITE_API_URL || 'https://eunacom-backend-v3.onrender.com'}/api/admin/users/${userId}/mock-exam-purchases`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${localStorage.getItem('accessToken') || ''}`,
      },
      body: JSON.stringify({ packageId }),
    });
    const data = await res.json();
    if (!data.success) throw new Error(data.message || 'Error al crear compra');
  }

  static async listControlPackages(): Promise<any[]> {
    const res = await fetch(`${import.meta.env.VITE_API_URL || 'https://eunacom-backend-v3.onrender.com'}/api/admin/control-packages`, {
      headers: {
        Authorization: `Bearer ${localStorage.getItem('accessToken') || ''}`,
      },
    });
    const data = await res.json();
    if (!data.success) throw new Error(data.message || 'Error al listar paquetes');
    return data.data.packages;
  }

  static async listExamPackages(): Promise<any[]> {
    const res = await fetch(`${import.meta.env.VITE_API_URL || 'https://eunacom-backend-v3.onrender.com'}/api/admin/exam-packages`, {
      headers: {
        Authorization: `Bearer ${localStorage.getItem('accessToken') || ''}`,
      },
    });
    const data = await res.json();
    if (!data.success) throw new Error(data.message || 'Error al listar paquetes');
    return data.data.packages;
  }

  static async listMockExamPackages(): Promise<any[]> {
    const res = await fetch(`${import.meta.env.VITE_API_URL || 'https://eunacom-backend-v3.onrender.com'}/api/admin/mock-exam-packages`, {
      headers: {
        Authorization: `Bearer ${localStorage.getItem('accessToken') || ''}`,
      },
    });
    const data = await res.json();
    if (!data.success) throw new Error(data.message || 'Error al listar paquetes');
    return data.data.packages;
  }
}
