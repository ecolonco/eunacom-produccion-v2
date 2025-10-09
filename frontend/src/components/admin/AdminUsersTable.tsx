import React from 'react';
import { AdminUsersService, AdminUserDto } from '../../services/adminUsers.service';

interface Props { onBack: () => void }

export const AdminUsersTable: React.FC<Props> = ({ onBack }) => {
  const [users, setUsers] = React.useState<AdminUserDto[]>([]);
  const originalUsersRef = React.useRef<AdminUserDto[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [savingAll, setSavingAll] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const load = async () => {
    try {
      setLoading(true);
      const data = await AdminUsersService.listUsers({ limit: 100 });
      setUsers(data.users);
      originalUsersRef.current = data.users;
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

  const handleToggle = (id: string, field: 'isActive' | 'isVerified') => {
    setUsers(prev => prev.map(u => u.id === id ? { ...u, [field]: !u[field] } as any : u));
  };

  const handleSave = async (u: AdminUserDto & { password?: string }) => {
    try {
      const payload: any = {
        email: u.email,
        firstName: u.firstName,
        lastName: u.lastName,
        username: u.username,
        credits: u.credits,
        isActive: u.isActive,
        isVerified: u.isVerified,
      };
      if ((u as any).password && (u as any).password!.length >= 6) payload.password = (u as any).password;
      const updated = await AdminUsersService.updateUser(u.id, payload);
      setUsers(prev => prev.map(x => x.id === u.id ? updated : x));
      originalUsersRef.current = originalUsersRef.current.map(x => x.id === updated.id ? updated : x);
      alert('Usuario actualizado');
    } catch (e: any) {
      alert(e?.message || 'Error al guardar');
    }
  };

  const hasChanges = React.useMemo(() => {
    const original = originalUsersRef.current;
    if (original.length !== users.length) return true;
    const byId = new Map(original.map(u => [u.id, u]));
    return users.some(u => {
      const o = byId.get(u.id);
      if (!o) return true;
      return o.email !== u.email || o.firstName !== u.firstName || o.lastName !== u.lastName || (o.username || '') !== (u.username || '') || o.credits !== u.credits;
    });
  }, [users]);

  const handleSaveAll = async () => {
    try {
      setSavingAll(true);
      const original = originalUsersRef.current;
      const byId = new Map(original.map(u => [u.id, u]));
      for (const u of users) {
        const o = byId.get(u.id);
        if (!o) {
          await handleSave(u as any);
          continue;
        }
        if (o.email !== u.email || o.firstName !== u.firstName || o.lastName !== u.lastName || (o.username || '') !== (u.username || '') || o.credits !== u.credits) {
          await handleSave(u as any);
        }
      }
      alert('Cambios guardados');
    } catch (e: any) {
      alert(e?.message || 'Error al guardar cambios');
    } finally {
      setSavingAll(false);
    }
  };

  if (loading) return <div className="p-6">Cargando...</div>;
  if (error) return <div className="p-6 text-red-600">{error}</div>;

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-semibold">👥 Usuarios</h2>
        <div className="flex gap-2">
          <button disabled={!hasChanges || savingAll} onClick={handleSaveAll} className={`px-3 py-2 rounded text-white ${hasChanges ? 'bg-blue-600 hover:bg-blue-700' : 'bg-gray-400 cursor-not-allowed'}`}>{savingAll ? 'Guardando...' : 'Guardar cambios'}</button>
          <button onClick={onBack} className="px-3 py-2 bg-gray-200 rounded">Volver</button>
        </div>
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
              <th className="p-2">Verificado</th>
              <th className="p-2">Activo</th>
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
                <td className="p-2">
                  <label className="inline-flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" checked={u.isVerified} onChange={() => handleToggle(u.id, 'isVerified')} />
                    <span className={u.isVerified ? 'text-green-700' : 'text-gray-600'}>{u.isVerified ? 'Sí' : 'No'}</span>
                  </label>
                </td>
                <td className="p-2">
                  <label className="inline-flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" checked={u.isActive} onChange={() => handleToggle(u.id, 'isActive')} />
                    <span className={u.isActive ? 'text-green-700' : 'text-gray-600'}>{u.isActive ? 'Sí' : 'No'}</span>
                  </label>
                </td>
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


