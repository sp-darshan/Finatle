import dotenv from 'dotenv';
import { ENV } from '../config/env';

export interface ScannedBillItem {
  name: string;
  price: number;
  quantity?: number;
}

export interface ScannedBillResult {
  merchant: string;
  amount: number;
  category: string;
  date: string;
  items: ScannedBillItem[];
  tax?: number;
  tip?: number;
  note?: string;
}

export class BillScannerService {
  /**
   * Scan and extract receipt details using Google Gemini Multimodal LLM Vision API
   */
  public static async scanBill(payload: {
    imageBase64?: string;
    mimeType?: string;
    rawText?: string;
    apiKey?: string;
    preset?: 'cafe' | 'supermarket' | 'fuel' | 'dining';
  }): Promise<ScannedBillResult> {
    const { imageBase64, mimeType = 'image/jpeg', rawText, apiKey, preset } = payload;

    // 1. Quick presets for testing
    if (preset) {
      return this.getPresetResult(preset);
    }

    if (!imageBase64 && !rawText) {
      throw new Error('No receipt image or text provided for AI analysis.');
    }

    // 2. Dynamically reload .env to ensure any recently added keys are immediately picked up
    dotenv.config();

    let geminiKey =
      apiKey ||
      process.env.GEMINI_API_KEY ||
      process.env.GOOGLE_API_KEY ||
      ENV.GEMINI_API_KEY;

    if (geminiKey) {
      geminiKey = geminiKey.trim().replace(/^["']|["']$/g, '');
    }

    if (!geminiKey || geminiKey === '' || geminiKey.includes('your-gemini-api-key')) {
      throw new Error(
        'GEMINI_API_KEY not found in server environment. Please ensure GEMINI_API_KEY is defined in server/.env'
      );
    }

    // 3. Call Gemini Multimodal LLM Vision model
    return await this.scanWithGeminiLLM({
      imageBase64,
      mimeType,
      rawText,
      apiKey: geminiKey,
    });
  }

  /**
   * Send receipt image to Gemini vision models with dynamic model discovery and auto-fallback
   */
  private static async scanWithGeminiLLM(data: {
    imageBase64?: string;
    mimeType?: string;
    rawText?: string;
    apiKey: string;
  }): Promise<ScannedBillResult> {
    const systemPrompt = `
You are an expert AI receipt and bill analysis system for a personal finance manager.
Analyze the provided bill / receipt image or text with high precision.
Extract:
1. "merchant": Store, restaurant, brand, or business name.
2. "amount": Final total payable numeric amount (after all discounts, additions, and taxes).
3. "category": Choose best match from ["Food & Dining", "Groceries", "Shopping", "Travel", "Entertainment", "Utilities", "Healthcare", "Personal", "Other"].
4. "date": Date of bill in YYYY-MM-DD format (or today's date if not visible).
5. "items": Itemized list of purchased items with item names and numeric prices.
6. "tax": Total GST/VAT/tax amount (number).
7. "tip": Tip or service charge (number).

Return ONLY raw JSON conforming to this schema without markdown code blocks:
{
  "merchant": "string",
  "amount": 0.0,
  "category": "Food & Dining",
  "date": "YYYY-MM-DD",
  "items": [
    { "name": "string", "price": 0.0, "quantity": 1 }
  ],
  "tax": 0.0,
  "tip": 0.0
}
`;

    const parts: any[] = [{ text: systemPrompt }];

    if (data.imageBase64) {
      const cleanBase64 = data.imageBase64.replace(/^data:image\/[a-zA-Z0-9+]+;base64,/, '');
      parts.push({
        inlineData: {
          mimeType: data.mimeType || 'image/jpeg',
          data: cleanBase64,
        },
      });
    }

    if (data.rawText) {
      parts.push({
        text: `Raw Receipt Content:\n${data.rawText}`,
      });
    }

    // 1. Try to discover valid models dynamically for this key
    let candidateEndpoints: string[] = [];

    try {
      const listRes = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models?key=${data.apiKey}`
      );
      if (listRes.ok) {
        const listJson = await listRes.json();
        if (Array.isArray(listJson.models)) {
          const supported = listJson.models
            .filter((m: any) =>
              Array.isArray(m.supportedGenerationMethods)
                ? m.supportedGenerationMethods.includes('generateContent')
                : true
            )
            .map((m: any) => m.name.replace(/^models\//, ''));

          // Prioritize flash models then pro models
          const flashModels = supported.filter((n: string) => n.includes('flash'));
          const proModels = supported.filter((n: string) => n.includes('pro') && !n.includes('flash'));
          const otherModels = supported.filter((n: string) => !n.includes('flash') && !n.includes('pro'));

          const ordered = [...flashModels, ...proModels, ...otherModels];
          candidateEndpoints = ordered.map(
            (m) => `https://generativelanguage.googleapis.com/v1beta/models/${m}:generateContent?key=${data.apiKey}`
          );
        }
      }
    } catch {
      // ignore listModels failure and use fallback endpoints
    }

    // Fallback static endpoints across v1 and v1beta
    if (candidateEndpoints.length === 0) {
      const fallbackModels = [
        'gemini-1.5-flash',
        'gemini-1.5-flash-latest',
        'gemini-1.5-flash-001',
        'gemini-1.5-flash-002',
        'gemini-2.0-flash',
        'gemini-2.0-flash-exp',
        'gemini-1.5-pro',
        'gemini-1.5-pro-latest',
        'gemini-1.0-pro-vision-latest',
      ];
      candidateEndpoints = [
        ...fallbackModels.map(
          (m) => `https://generativelanguage.googleapis.com/v1beta/models/${m}:generateContent?key=${data.apiKey}`
        ),
        ...fallbackModels.map(
          (m) => `https://generativelanguage.googleapis.com/v1/models/${m}:generateContent?key=${data.apiKey}`
        ),
      ];
    }

    let lastError: any = null;

    for (const endpoint of candidateEndpoints) {
      try {
        const response = await fetch(endpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ role: 'user', parts }],
            generationConfig: {
              temperature: 0.1,
              responseMimeType: 'application/json',
            },
          }),
        });

        if (!response.ok) {
          const errBody = await response.text();
          let errorMsg = `HTTP ${response.status}`;
          try {
            const parsedErr = JSON.parse(errBody);
            if (parsedErr?.error?.message) {
              errorMsg = parsedErr.error.message;
            }
          } catch {
            errorMsg = errBody;
          }
          lastError = new Error(`Gemini: ${errorMsg}`);
          continue; // Try next endpoint
        }

        const json = await response.json();
        const candidateText = json.candidates?.[0]?.content?.parts?.[0]?.text;

        if (!candidateText) {
          continue;
        }

        const parsed = JSON.parse(candidateText.trim());
        const today = new Date().toISOString().split('T')[0];

        return {
          merchant: String(parsed.merchant || 'Store Bill'),
          amount: Number(parsed.amount) || 0,
          category: String(parsed.category || 'Food & Dining'),
          date: String(parsed.date || today),
          items: Array.isArray(parsed.items)
            ? parsed.items.map((it: any) => ({
                name: String(it.name || 'Item'),
                price: Number(it.price) || 0,
                quantity: Number(it.quantity) || 1,
              }))
            : [],
          tax: Number(parsed.tax) || 0,
          tip: Number(parsed.tip) || 0,
        };
      } catch (err) {
        lastError = err;
      }
    }

    throw lastError || new Error('Failed to analyze receipt with Gemini Vision.');
  }

  /**
   * Realistic presets for testing without an API key
   */
  private static getPresetResult(preset: string): ScannedBillResult {
    const today = new Date().toISOString().split('T')[0];

    if (preset === 'supermarket') {
      return {
        merchant: 'Nature Basket Supermarket',
        amount: 1450,
        category: 'Groceries',
        date: today,
        items: [
          { name: 'Organic Milk & Farm Eggs', price: 350, quantity: 2 },
          { name: 'Fresh Fruits & Greens', price: 620, quantity: 1 },
          { name: 'Artisan Sourdough & Snacks', price: 480, quantity: 1 },
        ],
        tax: 65,
      };
    }

    if (preset === 'fuel') {
      return {
        merchant: 'Shell Petrol Pump',
        amount: 2000,
        category: 'Travel',
        date: today,
        items: [
          { name: 'Shell V-Power Petrol (18.5 L)', price: 2000, quantity: 1 },
        ],
        tax: 0,
      };
    }

    if (preset === 'dining') {
      return {
        merchant: 'Barbeque Nation Diner',
        amount: 2800,
        category: 'Food & Dining',
        date: today,
        items: [
          { name: '4x Grand Buffet Feast', price: 2400, quantity: 4 },
          { name: 'Mocktails & Desserts', price: 400, quantity: 2 },
        ],
        tax: 140,
        tip: 100,
      };
    }

    // Default: Cafe Receipt
    return {
      merchant: 'Starbucks Coffee',
      amount: 640,
      category: 'Food & Dining',
      date: today,
      items: [
        { name: '2x Caffe Latte (Grande)', price: 480, quantity: 2 },
        { name: '1x Butter Almond Croissant', price: 160, quantity: 1 },
      ],
      tax: 32,
    };
  }
}
