import React, { useEffect, useMemo, useState } from 'react';
import { User, PurchaseOrder, PurchaseOrderItem } from '../../types';
import { procurementService } from '../../services/procurementService';

export const PurchaseOrdersView: React.FC<{ user: User; addToast: (m: string, t?: 'success' | 'error') => void }>
    = ({ user, addToast }) => {
        const [pos, setPOs] = useState<PurchaseOrder[]>([]);
        const [desc, setDesc] = useState('');
        const [qty, setQty] = useState(1);
        const [price, setPrice] = useState(0);

        useEffect(() => {
            procurementService.listPurchaseOrders(user.companyId).then(setPOs).catch(() => addToast('Failed to load purchase orders', 'error'));
        }, [user.companyId, addToast]);

        const createQuickPO = async () => {
            if (!desc.trim() || qty <= 0) return;
            const item: Omit<PurchaseOrderItem, 'id' | 'amount'> = { description: desc, quantity: qty, unitPrice: price } as any;
            const po = await procurementService.createPurchaseOrder({
                companyId: user.companyId,
                vendorId: 'unassigned',
                date: new Date().toISOString(),
                status: 'DRAFT' as any,
                items: [item as any],
                subtotal: 0,
                taxRate: 0,
                taxAmount: 0,
                totalCost: 0,
                createdBy: user.id,
                createdAt: '' as any,
                updatedAt: '' as any,
            } as any);
            setPOs(list => [po, ...list]);
            setDesc(''); setQty(1); setPrice(0);
            addToast('Purchase order created');
        };

        const receive = async (poId: string) => {
            try {
                const updated = await procurementService.receive(poId, user.companyId, user.id);
                setPOs(list => list.map(p => p.id === updated.id ? updated : p));
                addToast('PO received: inventory and expenses updated');
            } catch (e) {
                addToast('Failed to receive PO', 'error');
            }
        };

        return (
            <div className="space-y-4">
                <h1 className="text-xl font-semibold">Purchase Orders</h1>
                <div className="flex gap-2 items-center">
                    <input value={desc} onChange={e => setDesc(e.target.value)} placeholder="Item description" className="border rounded px-3 py-2" />
                    <input type="number" value={qty} onChange={e => setQty(Number(e.target.value))} placeholder="Qty" className="border rounded px-2 py-2 w-24" />
                    <input type="number" value={price} onChange={e => setPrice(Number(e.target.value))} placeholder="Unit price" className="border rounded px-2 py-2 w-28" />
                    <button onClick={createQuickPO} className="rounded bg-primary px-3 py-2 text-primary-foreground">Quick PO</button>
                </div>
                <table className="w-full text-sm border rounded overflow-hidden">
                    <thead className="bg-muted text-foreground">
                        <tr>
                            <th className="text-left p-2">PO ID</th>
                            <th className="text-left p-2">Date</th>
                            <th className="text-left p-2">Status</th>
                            <th className="text-right p-2">Total</th>
                            <th className="text-right p-2">Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {pos.map(po => (
                            <tr key={po.id} className="border-t">
                                <td className="p-2">{po.id.slice(0, 8)}</td>
                                <td className="p-2">{new Date(po.date).toLocaleDateString()}</td>
                                <td className="p-2">{po.status}</td>
                                <td className="p-2 text-right">{po.totalCost.toFixed(2)}</td>
                                <td className="p-2 text-right">
                                    {po.status !== 'RECEIVED' && (
                                        <button onClick={() => receive(po.id)} className="rounded border px-2 py-1 text-xs">Mark Received</button>
                                    )}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        );
    };
