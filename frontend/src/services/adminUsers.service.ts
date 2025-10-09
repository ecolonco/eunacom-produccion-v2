export interface AdminUserDto {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  username?: string;
  role: string;
  credits: number;
  isActive: boolean;
  createdAt: string;
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

  static async updateUser(id: string, payload: Partial<{ email: string; firstName: string; lastName: string; username: string; password: string; credits: number }>): Promise<AdminUserDto> {
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
}
