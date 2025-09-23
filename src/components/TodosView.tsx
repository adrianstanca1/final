import React, { useEffect, useState } from 'react';
import type { User } from '../types';
import { getSupabase } from '../services/supabaseClient';

interface TodosViewProps {
    user: User;
    addToast: (m: string, t?: 'success' | 'error') => void;
}

interface TodoRow {
    id: string;
    user_id: string;
    title: string;
    inserted_at?: string;
}

export const TodosView: React.FC<TodosViewProps> = ({ user, addToast }) => {
    const supabase = getSupabase();
    const [items, setItems] = useState<TodoRow[]>([]);
    const [newTitle, setNewTitle] = useState('');
    const [loading, setLoading] = useState(false);
    const [isAuthed, setIsAuthed] = useState(false);

    useEffect(() => {
        const load = async () => {
            if (!supabase) return;
            const { data: sessionData } = await supabase.auth.getSession();
            setIsAuthed(!!sessionData.session);
            if (!sessionData.session) return;
            setLoading(true);
            try {
                const { data, error } = await supabase.from('todos').select('*').order('inserted_at', { ascending: false });
                if (error) throw error;
                setItems((data as TodoRow[]) ?? []);
            } catch (e: any) {
                addToast(e?.message || 'Failed to load todos', 'error');
            } finally {
                setLoading(false);
            }
        };
        void load();
    }, [supabase, addToast]);

    const onAdd = async () => {
        if (!supabase) return;
        const title = newTitle.trim();
        if (!title) return;
        setLoading(true);
        try {
            const payload = { title, user_id: user.id };
            const { data, error } = await supabase.from('todos').insert(payload).select('*').single();
            if (error) throw error;
            setItems(prev => [data as TodoRow, ...prev]);
            setNewTitle('');
            addToast('Todo added', 'success');
        } catch (e: any) {
            addToast(e?.message || 'Failed to add todo', 'error');
        } finally {
            setLoading(false);
        }
    };

    if (!supabase) {
        return (
            <div className="max-w-xl space-y-3">
                <h2 className="text-xl font-semibold">Todos (Supabase)</h2>
                <p className="text-sm text-muted-foreground">Supabase is not configured. Set `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` in `.env.local` to enable.</p>
            </div>
        );
    }

    if (!isAuthed) {
        return (
            <div className="max-w-xl space-y-3">
                <h2 className="text-xl font-semibold">Todos (Supabase)</h2>
                <p className="text-sm text-muted-foreground">Please sign in (e.g., Continue with Google) to read/write your todos.</p>
            </div>
        );
    }

    return (
        <div className="max-w-xl space-y-4">
            <div className="space-y-2">
                <h2 className="text-xl font-semibold">Todos (Supabase)</h2>
                <p className="text-sm text-muted-foreground">RLS must allow the signed-in user to read/write `public.todos` where `user_id = auth.uid()`.</p>
            </div>
            <div className="flex gap-2">
                <input
                    className="flex-1 rounded-md border border-border bg-background p-2"
                    placeholder="New todo title"
                    value={newTitle}
                    onChange={(e) => setNewTitle(e.target.value)}
                    disabled={loading}
                />
                <button onClick={onAdd} disabled={loading} className="rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground">Add</button>
            </div>
            <ul className="divide-y divide-border rounded-md border border-border">
                {items.map((t) => (
                    <li key={t.id} className="p-3 text-sm">{t.title}</li>
                ))}
                {items.length === 0 && (
                    <li className="p-3 text-sm text-muted-foreground">No todos yet.</li>
                )}
            </ul>
        </div>
    );
};

export default TodosView;
