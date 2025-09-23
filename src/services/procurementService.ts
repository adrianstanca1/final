import { Vendor, PurchaseOrder, PurchaseOrderItem, PurchaseOrderStatus } from '../types';
import { api } from './mockApi';

export const procurementService = {
  async listVendors(companyId: string): Promise<Vendor[]> {
    return api.listVendors(companyId);
  },
  async upsertVendor(vendor: Partial<Vendor>): Promise<Vendor> {
    return api.upsertVendor(vendor);
  },
  async listPurchaseOrders(companyId: string): Promise<PurchaseOrder[]> {
    return api.listPurchaseOrders(companyId);
  },
  async createPurchaseOrder(po: Omit<PurchaseOrder, 'id' | 'createdAt' | 'updatedAt'>): Promise<PurchaseOrder> {
    return api.createPurchaseOrder(po);
  },
  async updatePurchaseOrder(poId: string, updates: Partial<PurchaseOrder>): Promise<PurchaseOrder> {
    return api.updatePurchaseOrder(poId, updates);
  },
  async addItem(poId: string, item: Omit<PurchaseOrderItem, 'id' | 'amount'>): Promise<PurchaseOrder> {
    return api.addPurchaseOrderItem(poId, item);
  },
  async setStatus(poId: string, status: PurchaseOrderStatus): Promise<PurchaseOrder> {
    return api.updatePurchaseOrder(poId, { status });
  },
};
