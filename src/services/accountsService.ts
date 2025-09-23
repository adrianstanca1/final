import { Budget } from '../types';
import { getSupabase } from './supabaseClient';
import { api } from './mockApi';

const toCamel = (row: any): Budget => ({
  id: row.id,
  companyId: row.company_id,
  projectId: row.project_id,
  amount: Number(row.amount || 0),
  spent: Number(row.spent || 0),
  currency: row.currency || 'USD',
  createdAt: row.created_at || new Date().toISOString(),
  updatedAt: row.updated_at || new Date().toISOString(),
});

const toSnake = (b: Partial<Budget>) => ({
  id: b.id,
  company_id: b.companyId,
  project_id: b.projectId,
  amount: b.amount,
  spent: b.spent,
  currency: b.currency,
  created_at: b.createdAt,
  updated_at: b.updatedAt,
});

export const accountsService = {
  async listBudgets(companyId: string): Promise<Budget[]> {
    const supabase = getSupabase();
    if (supabase) {
      const { data, error } = await supabase
        .from('budgets')
        .select('*')
        .eq('company_id', companyId)
        .order('updated_at', { ascending: false });
      if (error) throw error;
      return (data || []).map(toCamel);
    }
    return (await (api as any).listBudgets(companyId)) as Budget[];
  },

  async upsertBudget(input: Partial<Budget>): Promise<Budget> {
    const supabase = getSupabase();
    if (supabase) {
      const payload = toSnake({ ...input, updatedAt: new Date().toISOString() });
      if (input.id) {
        const { data, error } = await supabase
          .from('budgets')
          .update(payload)
          .eq('id', input.id)
          .select('*')
          .single();
        if (error) throw error;
        return toCamel(data);
      } else {
        const now = new Date().toISOString();
        const { data, error } = await supabase
          .from('budgets')
          .insert([{ ...payload, created_at: now, updated_at: now }])
          .select('*')
          .single();
        if (error) throw error;
        return toCamel(data);
      }
    }
    return (await (api as any).upsertBudget(input)) as Budget;
  },

  async deleteBudget(id: string): Promise<void> {
    const supabase = getSupabase();
    if (supabase) {
      const { error } = await supabase.from('budgets').delete().eq('id', id);
      if (error) throw error;
      return;
    }
    await (api as any).deleteBudget(id);
  },
};
