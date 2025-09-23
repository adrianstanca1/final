import React, { useEffect, useState } from 'react';
import { User, Vendor } from '../../types';
import { procurementService } from '../../services/procurementService';

export const VendorsView: React.FC<{ user: User; addToast: (m: string, t?: 'success'|'error') => void }>
= ({ user, addToast }) => {
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [name, setName] = useState('');

  useEffect(() => {
    procurementService.listVendors(user.companyId).then(setVendors).catch(() => addToast('Failed to load vendors','error'));
  }, [user.companyId, addToast]);

  const addVendor = async () => {
    if (!name.trim()) return;
    const created = await procurementService.upsertVendor({ companyId: user.companyId, name, isActive: true });
    setVendors(v => [created, ...v]);
    setName('');
    addToast('Vendor added');
  };

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold">Vendors</h1>
      <div className="flex gap-2">
        <input value={name} onChange={e=>setName(e.target.value)} placeholder="Vendor name" className="border rounded px-3 py-2" />
        <button onClick={addVendor} className="rounded bg-primary px-3 py-2 text-primary-foreground">Add</button>
      </div>
      <ul className="divide-y border rounded">
        {vendors.map(v => (
          <li key={v.id} className="p-3 flex justify-between">
            <span>{v.name}</span>
            <span className="text-xs text-muted-foreground">{v.isActive ? 'Active' : 'Inactive'}</span>
          </li>
        ))}
      </ul>
    </div>
  );
};
