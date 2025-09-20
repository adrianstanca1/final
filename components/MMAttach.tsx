import React, { useState } from 'react';

const toBase64 = (file: File): Promise<{ mimeType: string;  string }> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = String(reader.result || '');
      const [meta, payload] = result.split(',');
      const mimeMatch = /^(.*?);base64$/.exec(meta || '');
      resolve({ mimeType: mimeMatch?.[1] || file.type || 'image/jpeg',  payload });
    };
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });

export default function MMAttach() {
  const [file, setFile] = useState<File | null>(null);
  const [prompt, setPrompt] = useState('Describe this image for site progress.');
  const [out, setOut] = useState<string>('');
  const [busy, setBusy] = useState(false);
  const [usePreprocess, setUsePreprocess] = useState(false);

  const API_BASE = (import.meta as any)?.env?.VITE_API_BASE || '';

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) return;
    setBusy(true);
    try {
      const b64 = await toBase64(file);
      const res = await fetch(`${API_BASE}/api/mm/analyze`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt, ...b64, usePreprocess }),
      });
      const json = await res.json();
      setOut(json.text || json.error || 'No response');
    } catch (err: any) {
      setOut(String(err?.message || err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <form onSubmit={onSubmit} className="space-y-2">
      <input type="file" accept="image/*" onChange={e => setFile(e.target.files?.[0] ?? null)} />
      <input
        className="border rounded p-2 w-full"
        value={prompt}
        onChange={e => setPrompt(e.target.value)}
        placeholder="Enter prompt"
      />
      <label className="flex items-center gap-2">
        <input type="checkbox" checked={usePreprocess} onChange={e => setUsePreprocess(e.target.checked)} />
        <span>Use server preprocess</span>
      </label>
      <button className="px-3 py-2 rounded bg-black text-white disabled:opacity-50" disabled={!file || busy}>
        {busy ? 'Analyzing…' : 'Analyze'}
      </button>
      {out && <pre className="whitespace-pre-wrap text-left p-2 border rounded">{out}</pre>}
    </form>
  );
}
