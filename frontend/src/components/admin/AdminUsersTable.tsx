import React from 'react';
import { AdminUsersService, AdminUserDto } from '../../services/adminUsers.service';

interface Props { onBack: () => void }

export const AdminUsersTable: React.FC<Props> = ({ onBack }) => {
  const [users, setUsers] = React.useState<AdminUserDto[]>([]);
  const originalUsersRef = React.useRef<AdminUserDto[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [savingAll, setSavingAll] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [expandedUserId, setExpandedUserId] = React.useState<string | null>(null);
  const [controlPackages, setControlPackages] = React.useState<any[]>([]);
  const [examPackages, setExamPackages] = React.useState<any[]>([]);
  const [mockExamPackages, setMockExamPackages] = React.useState<any[]>([]);

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

  React.useEffect(() => { 
    void load(); 
    void loadPackages();
  }, []);

  const loadPackages = async () => {
    try {
      const [controls, exams, mockExams] = await Promise.all([
        AdminUsersService.listControlPackages(),
        AdminUsersService.listExamPackages(),
        AdminUsersService.listMockExamPackages(),
      ]);
      setControlPackages(controls);
      setExamPackages(exams);
      setMockExamPackages(mockExams);
    } catch (e) {
      console.error('Error loading packages:', e);
    }
  };

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

  const handleUpdateControlPurchase = async (userId: string, purchaseId: string, controlsUsed: number) => {
    try {
      await AdminUsersService.updateControlPurchase(userId, purchaseId, controlsUsed);
      await load(); // Recargar datos
      alert('Compra actualizada');
    } catch (e: any) {
      alert(e?.message || 'Error al actualizar');
    }
  };

  const handleUpdateExamPurchase = async (userId: string, purchaseId: string, examsUsed: number) => {
    try {
      await AdminUsersService.updateExamPurchase(userId, purchaseId, examsUsed);
      await load();
      alert('Compra actualizada');
    } catch (e: any) {
      alert(e?.message || 'Error al actualizar');
    }
  };

  const handleUpdateMockExamPurchase = async (userId: string, purchaseId: string, mockExamsUsed: number) => {
    try {
      await AdminUsersService.updateMockExamPurchase(userId, purchaseId, mockExamsUsed);
      await load();
      alert('Compra actualizada');
    } catch (e: any) {
      alert(e?.message || 'Error al actualizar');
    }
  };

  const handleCreateControlPurchase = async (userId: string, packageId: string) => {
    try {
      await AdminUsersService.createControlPurchase(userId, packageId);
      await load();
      alert('Paquete de controles asignado');
    } catch (e: any) {
      alert(e?.message || 'Error al asignar paquete');
    }
  };

  const handleCreateExamPurchase = async (userId: string, packageId: string) => {
    try {
      await AdminUsersService.createExamPurchase(userId, packageId);
      await load();
      alert('Paquete de pruebas asignado');
    } catch (e: any) {
      alert(e?.message || 'Error al asignar paquete');
    }
  };

  const handleCreateMockExamPurchase = async (userId: string, packageId: string) => {
    try {
      await AdminUsersService.createMockExamPurchase(userId, packageId);
      await load();
      alert('Paquete de ensayos asignado');
    } catch (e: any) {
      alert(e?.message || 'Error al asignar paquete');
    }
  };

  const handleToggleActive = async (userId: string, isActive: boolean, role: string) => {
    // Prevenir desactivar admins
    if (role === 'ADMIN' && isActive) {
      alert('⛔ No se puede desactivar un usuario administrador');
      return;
    }

    const action = isActive ? 'desactivar' : 'activar';
    if (!confirm(`¿Estás seguro de ${action} este usuario?`)) {
      return;
    }

    try {
      const updated = await AdminUsersService.toggleUserActive(userId);
      setUsers(prev => prev.map(u => u.id === userId ? updated : u));
      originalUsersRef.current = originalUsersRef.current.map(u => u.id === userId ? updated : u);
      alert(`Usuario ${updated.isActive ? 'activado' : 'desactivado'} correctamente`);
    } catch (e: any) {
      alert(e?.message || 'Error al cambiar estado del usuario');
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
              <th className="p-2">Paquetes</th>
              <th className="p-2">Verificado</th>
              <th className="p-2">Activo</th>
              <th className="p-2">Nueva password</th>
              <th className="p-2">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {users.map(u => {
              const totalControls = (u.controlPurchases || []).reduce((sum, p) => sum + (p.controlsTotal - p.controlsUsed), 0);
              const totalExams = (u.examPurchases || []).reduce((sum, p) => sum + (p.examsTotal - p.examsUsed), 0);
              const totalMockExams = (u.mockExamPurchases || []).reduce((sum, p) => sum + (p.mockExamsTotal - p.mockExamsUsed), 0);
              const isExpanded = expandedUserId === u.id;
              
              return (
                <React.Fragment key={u.id}>
                  <tr className="border-b hover:bg-gray-50">
                    <td className="p-2"><input className="border p-1 rounded w-64" value={u.email} onChange={e => handleChange(u.id, 'email' as any, e.target.value)} /></td>
                    <td className="p-2"><input className="border p-1 rounded w-40" value={u.firstName} onChange={e => handleChange(u.id, 'firstName' as any, e.target.value)} /></td>
                    <td className="p-2"><input className="border p-1 rounded w-40" value={u.lastName} onChange={e => handleChange(u.id, 'lastName' as any, e.target.value)} /></td>
                    <td className="p-2"><input className="border p-1 rounded w-40" value={u.username || ''} onChange={e => handleChange(u.id, 'username' as any, e.target.value)} /></td>
                    <td className="p-2"><input type="number" className="border p-1 rounded w-24" value={u.credits} onChange={e => handleChange(u.id, 'credits' as any, e.target.value)} /></td>
                    <td className="p-2">
                      <button 
                        onClick={() => setExpandedUserId(isExpanded ? null : u.id)} 
                        className="text-sm text-blue-600 hover:underline flex items-center gap-1"
                      >
                        <span>{isExpanded ? '▼' : '▶'}</span>
                        <span>C:{totalControls} P:{totalExams} E:{totalMockExams}</span>
                      </button>
                    </td>
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
                      <div className="flex gap-2">
                        <button onClick={() => handleSave(u as any)} className="px-3 py-2 bg-blue-600 text-white rounded hover:bg-blue-700">Guardar</button>
                        <button
                          onClick={() => handleToggleActive(u.id, u.isActive, u.role)}
                          className={`px-3 py-2 rounded text-white ${u.isActive ? 'bg-red-600 hover:bg-red-700' : 'bg-green-600 hover:bg-green-700'}`}
                          title={u.isActive ? 'Desactivar usuario' : 'Activar usuario'}
                        >
                          {u.isActive ? '🚫 Desactivar' : '✅ Activar'}
                        </button>
                      </div>
                    </td>
                  </tr>
                  {isExpanded && (
                    <tr>
                      <td colSpan={10} className="p-4 bg-gray-50">
                        <div className="space-y-4">
                          {/* Controles */}
                          {(u.controlPurchases || []).length > 0 && (
                            <div>
                              <h4 className="font-semibold mb-2">📝 Controles:</h4>
                              <div className="space-y-2">
                                {u.controlPurchases!.map(p => (
                                  <div key={p.id} className="flex items-center gap-3 bg-white p-2 rounded border">
                                    <span className="text-sm">{p.package.name}</span>
                                    <span className="text-sm text-gray-600">Total: {p.controlsTotal}</span>
                                    <span className="text-sm text-gray-600">Usados:</span>
                                    <input 
                                      type="number" 
                                      className="border p-1 rounded w-20 text-sm" 
                                      value={p.controlsUsed}
                                      onChange={(e) => {
                                        const newValue = parseInt(e.target.value) || 0;
                                        handleUpdateControlPurchase(u.id, p.id, newValue);
                                      }}
                                    />
                                    <span className="text-sm text-green-600 font-semibold">Disponibles: {p.controlsTotal - p.controlsUsed}</span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                          {/* Pruebas */}
                          {(u.examPurchases || []).length > 0 && (
                            <div>
                              <h4 className="font-semibold mb-2">🎓 Pruebas:</h4>
                              <div className="space-y-2">
                                {u.examPurchases!.map(p => (
                                  <div key={p.id} className="flex items-center gap-3 bg-white p-2 rounded border">
                                    <span className="text-sm">{p.package.name}</span>
                                    <span className="text-sm text-gray-600">Total: {p.examsTotal}</span>
                                    <span className="text-sm text-gray-600">Usados:</span>
                                    <input 
                                      type="number" 
                                      className="border p-1 rounded w-20 text-sm" 
                                      value={p.examsUsed}
                                      onChange={(e) => {
                                        const newValue = parseInt(e.target.value) || 0;
                                        handleUpdateExamPurchase(u.id, p.id, newValue);
                                      }}
                                    />
                                    <span className="text-sm text-green-600 font-semibold">Disponibles: {p.examsTotal - p.examsUsed}</span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                          {/* Ensayos */}
                          {(u.mockExamPurchases || []).length > 0 && (
                            <div>
                              <h4 className="font-semibold mb-2">🎯 Ensayos EUNACOM:</h4>
                              <div className="space-y-2">
                                {u.mockExamPurchases!.map(p => (
                                  <div key={p.id} className="flex items-center gap-3 bg-white p-2 rounded border">
                                    <span className="text-sm">{p.package.name}</span>
                                    <span className="text-sm text-gray-600">Total: {p.mockExamsTotal}</span>
                                    <span className="text-sm text-gray-600">Usados:</span>
                                    <input 
                                      type="number" 
                                      className="border p-1 rounded w-20 text-sm" 
                                      value={p.mockExamsUsed}
                                      onChange={(e) => {
                                        const newValue = parseInt(e.target.value) || 0;
                                        handleUpdateMockExamPurchase(u.id, p.id, newValue);
                                      }}
                                    />
                                    <span className="text-sm text-green-600 font-semibold">Disponibles: {p.mockExamsTotal - p.mockExamsUsed}</span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                          {/* Agregar nuevos paquetes */}
                          <div className="border-t pt-4 mt-4">
                            <h4 className="font-semibold mb-3">➕ Asignar Nuevo Paquete:</h4>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                              {/* Controles */}
                              <div>
                                <label className="block text-sm font-medium mb-1">📝 Controles:</label>
                                <select 
                                  className="border p-2 rounded w-full text-sm mb-2"
                                  onChange={(e) => e.target.value && handleCreateControlPurchase(u.id, e.target.value)}
                                  value=""
                                >
                                  <option value="">Seleccionar paquete...</option>
                                  {controlPackages.map(pkg => (
                                    <option key={pkg.id} value={pkg.id}>
                                      {pkg.name} - {pkg.controlQty} controles - ${pkg.price.toLocaleString()}
                                    </option>
                                  ))}
                                </select>
                              </div>
                              {/* Pruebas */}
                              <div>
                                <label className="block text-sm font-medium mb-1">🎓 Pruebas:</label>
                                <select 
                                  className="border p-2 rounded w-full text-sm mb-2"
                                  onChange={(e) => e.target.value && handleCreateExamPurchase(u.id, e.target.value)}
                                  value=""
                                >
                                  <option value="">Seleccionar paquete...</option>
                                  {examPackages.map(pkg => (
                                    <option key={pkg.id} value={pkg.id}>
                                      {pkg.name} - {pkg.examQty} pruebas - ${pkg.price.toLocaleString()}
                                    </option>
                                  ))}
                                </select>
                              </div>
                              {/* Ensayos */}
                              <div>
                                <label className="block text-sm font-medium mb-1">🎯 Ensayos:</label>
                                <select 
                                  className="border p-2 rounded w-full text-sm mb-2"
                                  onChange={(e) => e.target.value && handleCreateMockExamPurchase(u.id, e.target.value)}
                                  value=""
                                >
                                  <option value="">Seleccionar paquete...</option>
                                  {mockExamPackages.map(pkg => (
                                    <option key={pkg.id} value={pkg.id}>
                                      {pkg.name} - {pkg.mockExamQty} ensayos - ${pkg.price.toLocaleString()}
                                    </option>
                                  ))}
                                </select>
                              </div>
                            </div>
                          </div>
                        </div>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default AdminUsersTable;


