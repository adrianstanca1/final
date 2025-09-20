import type { VercelRequest, VercelResponse } from '@vercel/node';
import { GoogleGenAI, createUserContent } from '@google/genai';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    if (req.method !== 'POST') {
      res.setHeader('Allow', 'POST');
      return res.status(405).json({ error: 'Method not allowed' });
    }

    let { prompt, mimeType, data, usePreprocess } = (req.body ?? {}) as {
      prompt?: string;
      mimeType?: string;
      data?: string; // Base64
      usePreprocess?: boolean;
    };

    if (!prompt) return res.status(400).json({ error: 'prompt is required' });

    // Optional server-side preprocessing via FastAPI if configured
    const preprocessUrl = process.env.MM_PREPROCESS_URL;
    if (preprocessUrl && usePreprocess && data && mimeType?.startsWith('image/')) {
      try {
        const form = new FormData();
        form.append('prompt', prompt);
        // @ts-ignore Node FormData supports Buffer parts under undici
        form.append('file', Buffer.from(data, 'base64'), { filename: 'image', contentType: mimeType });
        const resp = await fetch(preprocessUrl, { method: 'POST', body: form } as any);
        const j = await resp.json();
        if (j?.data && j?.mimeType) {
          data = j.data;
          mimeType = j.mimeType;
        }
      } catch {}
    }

    if (!mimeType || !data) {
      return res.status(400).json({ error: 'mimeType and data are required' });
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return res.status(500).json({ error: 'Server not configured: GEMINI_API_KEY missing' });
    }

    const ai = new GoogleGenAI({ apiKey });

    const result = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: createUserContent([
        { text: prompt },
        { inlineData: { mimeType, data } },
      ]),
    });

    const text = typeof (result as any).text === 'function' ? (result as any).text() : (result as any).text;
    return res.status(200).json({ text });
  } catch (err: any) {
    return res.status(500).json({ error: String(err?.message || err) });
  }
}
