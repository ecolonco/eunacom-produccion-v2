import React from 'react';
import { AdminUsersService, AdminUserDto } from '../../services/adminUsers.service';

interface Props { onBack: () => void }

export const AdminUsersTable: React.FC<Props> = ({ onBack }) => {
  const [users, setUsers] = React.useState<AdminUserDto[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  const load = async () => {
    try {
      setLoading(true);
      const data = await AdminUsersService.listUsers({ limit: 100 });
      setUsers(data.users);
    } catch (e: any) {
      setError(e?.message || 'Error al cargar usuarios');
    } finally {
      setLoading(false);
    }
  };

  React.useEffect(() => { void load(); }, []);

  const handleChange = (id: string, field: keyof AdminUserDto | 'password', value: string) => {
    setUsers(prev => prev.map(u => u.id === id ? { ...u, [field]: field === 'credits' ? Number(value) : value } as any : u));
  };

  const handleSave = async (u: AdminUserDto & { password?: string }) => {
    try {
      const payload: any = {
        email: u.email,
        firstName: u.firstName,
        lastName: u.lastName,
        username: u.username,
        credits: u.credits,
      };
      if ((u as any).password && (u as any).password!.length >= 6) payload.password = (u as any).password;
      const updated = await AdminUsersService.updateUser(u.id, payload);
      setUsers(prev => prev.map(x => x.id === u.id ? updated : x));
      alert('Usuario actualizado');
    } catch (e: any) {
      alert(e?.message || 'Error al guardar');
    }
  };

  if (loading) return <div className="p-6">Cargando...</div>;
  if (error) return <div className="p-6 text-red-600">{error}</div>;

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-semibold">👥 Usuarios</h2>
        <button onClick={onBack} className="px-3 py-2 bg-gray-200 rounded">Volver</button>
      </div>
      <div className="overflow-auto">
        <table className="min-w-full text-sm">
          <thead>
            <tr className="text-left border-b">
              <th className="p-2">Email</th>
              <th className="p-2">Nombre</th>
              <th className="p-2">Apellido</th>
              <th className="p-2">Usuario</th>
              <th className="p-2">Créditos</th>
              <th className="p-2">Nueva password</th>
              <th className="p-2">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {users.map(u => (
              <tr key={u.id} className="border-b">
                <td className="p-2"><input className="border p-1 rounded w-64" value={u.email} onChange={e => handleChange(u.id, 'email' as any, e.target.value)} /></td>
                <td className="p-2"><input className="border p-1 rounded w-40" value={u.firstName} onChange={e => handleChange(u.id, 'firstName' as any, e.target.value)} /></td>
                <td className="p-2"><input className="border p-1 rounded w-40" value={u.lastName} onChange={e => handleChange(u.id, 'lastName' as any, e.target.value)} /></td>
                <td className="p-2"><input className="border p-1 rounded w-40" value={u.username || ''} onChange={e => handleChange(u.id, 'username' as any, e.target.value)} /></td>
                <td className="p-2"><input type="number" className="border p-1 rounded w-24" value={u.credits} onChange={e => handleChange(u.id, 'credits' as any, e.target.value)} /></td>
                <td className="p-2"><input type="password" className="border p-1 rounded w-40" placeholder="(min 6)" onChange={e => handleChange(u.id, 'password' as any, e.target.value)} /></td>
                <td className="p-2">
                  <button onClick={() => handleSave(u as any)} className="px-3 py-2 bg-blue-600 text-white rounded">Guardar</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default AdminUsersTable;


