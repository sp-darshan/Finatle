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
   * Scan and extract receipt details using Google Gemini Vision API.
   *
   * Optimized for speed:
   * - No model discovery
   * - No fallback model loop
   * - Single Gemini request
   * - Structured JSON response
   * - Bill validation included
   */
  public static async scanBill(payload: {
    imageBase64?: string;
    mimeType?: string;
    rawText?: string;
    apiKey?: string;
    preset?: 'cafe' | 'supermarket' | 'fuel' | 'dining';
  }): Promise<ScannedBillResult> {
    const {
      imageBase64,
      mimeType = 'image/jpeg',
      rawText,
      apiKey,
      preset,
    } = payload;

    // Presets are only for development/testing.
    if (preset) {
      return this.getPresetResult(preset);
    }

    if (!imageBase64 && !rawText) {
      throw new Error(
        'No receipt image or text provided for AI analysis.'
      );
    }

    dotenv.config();

    const geminiKey =
      apiKey?.trim() ||
      process.env.GEMINI_API_KEY?.trim() ||
      process.env.GOOGLE_API_KEY?.trim() ||
      ENV.GEMINI_API_KEY?.trim();

    if (
      !geminiKey ||
      geminiKey === '' ||
      geminiKey.includes('your-gemini-api-key')
    ) {
      throw new Error(
        'GEMINI_API_KEY not found in server environment.'
      );
    }

    return await this.scanWithGeminiLLM({
      imageBase64,
      mimeType,
      rawText,
      apiKey: geminiKey,
    });
  }

  /**
   * Analyze and validate a receipt using Gemini.
   *
   * Uses a single fast multimodal model.
   */
  private static async scanWithGeminiLLM(data: {
    imageBase64?: string;
    mimeType?: string;
    rawText?: string;
    apiKey: string;
  }): Promise<ScannedBillResult> {
    const startTime = Date.now();

    /**
     * Fast multimodal model suitable for receipt extraction.
     */
    const MODEL = 'gemini-3.5-flash-lite';

    const prompt = `
You are an expert receipt, bill, and invoice extraction and validation engine.

Your task has TWO stages:

STAGE 1 — VALIDATE THE INPUT

Determine whether the provided image/text is a genuine bill, invoice, receipt, purchase receipt, restaurant check/KOT, supermarket bill, grocery slip, fuel receipt, shopping receipt, utility bill, pharmacy bill, or another legitimate transaction document.

A valid bill must contain transaction-related information such as:
- Merchant/store/business name
- Purchased goods, services, or line items
- Total transaction amount
- Date or invoice details
- Tax/item breakdown

INVALID examples:
- Selfies, human portraits, landscapes, random photos
- Screenshots unrelated to financial purchases
- Blank or unreadable images
- Catalogs, advertisements, or menu cards without an actual purchase transaction
- Text that is not a transaction bill or receipt

If the input is NOT a bill or receipt, return:
{
  "validBill": false
}

STAGE 2 — EXTRACT TRANSACTION DATA

If the input is a valid bill/receipt, extract the data in this exact JSON structure:
{
  "validBill": true,
  "merchant": "Merchant / Store Name",
  "amount": 0.00,
  "category": "Dining",
  "date": "YYYY-MM-DD",
  "items": [
    {
      "name": "Item or Service Name",
      "quantity": 1,
      "price": 0.00
    }
  ],
  "tax": 0.00,
  "tip": 0.00,
  "note": "Optional note"
}

CRITICAL RULES FOR EXTRACTION:

1. MERCHANT NAME:
   - Must be the actual merchant/store/business name visible at the top or header of the receipt.

2. TOTAL AMOUNT:
   - "amount" MUST be the final total payable transaction amount (Net Payable / Grand Total / Total) in numeric format.

3. ITEMS, QUANTITY & COST EXTRACTION (CRITICAL):
   - Extract EVERY individual product, dish, service, or line item purchased.
   - "name": Clean, concise product or service name (e.g. "Cappuccino", "Whole Wheat Bread", "Paneer Tikka", "Petrol 10L").
   - "quantity": The exact numeric count, units, or multiplier of that item purchased (e.g. 1, 2, 3, 5, 1.5).
     * Carefully inspect receipt columns for "Qty", "Quantity", "PCS", "Nos", "Units", or multipliers like "2 x 150.00" or "@ 150".
     * If 3 units of an item are bought, "quantity" MUST be 3.
     * Default "quantity" to 1 only if no specific count/multiplier is visible.
   - "price": The UNIT COST / price per single item (e.g., if 2 items cost 300 in total, the unit price is 150.00).
     * If the receipt shows unit rate (e.g. "Rate: 150, Qty: 2, Amt: 300"), set "price": 150.00 and "quantity": 2.
     * If the receipt only shows the total line amount (e.g. "2 Coffee 400.00"), calculate the unit price: 400 / 2 = 200.00.
     * "price" must always be a positive numeric value representing the single-item cost.

4. CATEGORY:
   - Must be one of:
     Dining, Food & Dining, Groceries, Shopping, Travel, Entertainment, Utilities, Rent, Investments, Health, Medical, Personal, Other.

5. DATE:
   - Extract the purchase date in YYYY-MM-DD format if visible, otherwise omit or use current date.

6. RETURN FORMAT:
   - Return ONLY raw valid JSON. No markdown code blocks, no backticks, no explanations.

VALID RECEIPT EXAMPLE:
{
  "validBill": true,
  "merchant": "Urban Cafe & Bakery",
  "amount": 540.00,
  "category": "Dining",
  "date": "2026-09-20",
  "items": [
    {
      "name": "Cappuccino",
      "quantity": 2,
      "price": 180.00
    },
    {
      "name": "Almond Croissant",
      "quantity": 1,
      "price": 150.00
    }
  ],
  "tax": 30.00,
  "tip": 0
}

INVALID EXAMPLE:
{
  "validBill": false
}
`;

    const parts: any[] = [
      {
        text: prompt,
      },
    ];

    /**
     * Add receipt image.
     */
    if (data.imageBase64) {
      const cleanBase64 = data.imageBase64.replace(
        /^data:image\/[^;]+;base64,/,
        ''
      );

      parts.push({
        inlineData: {
          mimeType: data.mimeType || 'image/jpeg',
          data: cleanBase64,
        },
      });
    }

    /**
     * Add raw receipt text if provided.
     */
    if (data.rawText) {
      parts.push({
        text: `Receipt text:\n${data.rawText}`,
      });
    }

    const endpoint =
      `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`;

    try {
      const response = await fetch(endpoint, {
        method: 'POST',

        headers: {
          'Content-Type': 'application/json',
          'x-goog-api-key': data.apiKey,
        },

        body: JSON.stringify({
          contents: [
            {
              role: 'user',
              parts,
            },
          ],

          generationConfig: {
            temperature: 0,
            responseMimeType: 'application/json',
            maxOutputTokens: 700,
          },
        }),
      });

      const elapsed = Date.now() - startTime;

      console.log(
        `[Gemini] Bill scan completed in ${elapsed}ms`
      );

      if (!response.ok) {
        const errorBody = await response.text();

        let errorMessage = `HTTP ${response.status}`;

        try {
          const parsedError = JSON.parse(errorBody);

          if (parsedError?.error?.message) {
            errorMessage = parsedError.error.message;
          }
        } catch {
          if (errorBody) {
            errorMessage = errorBody;
          }
        }

        throw new Error(
          `Gemini: ${errorMessage}`
        );
      }

      const json = await response.json();

      const candidateText =
        json.candidates?.[0]?.content?.parts?.[0]?.text;

      if (!candidateText) {
        throw new Error(
          'Gemini returned no usable response.'
        );
      }

      let parsed: any;

      try {
        parsed = JSON.parse(candidateText.trim());
      } catch {
        throw new Error(
          `Gemini returned invalid JSON: ${candidateText}`
        );
      }

      /**
       * =====================================================
       * BILL VALIDATION
       * =====================================================
       */

      if (parsed.validBill !== true) {
        throw new Error(
          'Invalid bill: The uploaded image or text does not appear to be a valid bill or receipt.'
        );
      }

      /**
       * Required fields.
       *
       * No defaults are provided.
       */
      if (
        typeof parsed.merchant !== 'string' ||
        parsed.merchant.trim() === ''
      ) {
        throw new Error(
          'Invalid bill: Merchant name could not be identified.'
        );
      }

      if (
        parsed.amount === undefined ||
        parsed.amount === null ||
        typeof parsed.amount !== 'number' ||
        !Number.isFinite(parsed.amount)
      ) {
        throw new Error(
          'Invalid bill: Final transaction amount could not be identified.'
        );
      }



      const validCategories = [
        'Dining',
        'Food & Dining',
        'Food',
        'Groceries',
        'Shopping',
        'Rent',
        'Rent & Housing',
        'Travel',
        'Entertainment',
        'Utilities',
        'Investments',
        'Investment',
        'Health',
        'Health & Fitness',
        'Healthcare',
        'Medical',
        'Personal',
        'Other',
      ];

      if (
        typeof parsed.category !== 'string' ||
        !validCategories.includes(parsed.category)
      ) {
        throw new Error(
          'Invalid bill: Transaction category could not be determined.'
        );
      }

      if (!Array.isArray(parsed.items)) {
        throw new Error(
          'Invalid bill: Purchased items could not be identified.'
        );
      }

      /**
       * Validate individual items.
       */
      const items: ScannedBillItem[] =
        parsed.items.map((item: any) => {
          if (
            !item ||
            typeof item.name !== 'string' ||
            item.name.trim() === ''
          ) {
            throw new Error(
              'Invalid bill: One or more item names could not be identified.'
            );
          }

          const parsedPrice =
            typeof item.price === 'number'
              ? item.price
              : typeof item.price === 'string'
              ? parseFloat(item.price.replace(/[^0-9.-]+/g, ''))
              : NaN;

          if (!Number.isFinite(parsedPrice) || parsedPrice < 0) {
            throw new Error(
              'Invalid bill: One or more item prices could not be identified.'
            );
          }

          const parsedQty =
            item.quantity !== undefined && item.quantity !== null
              ? typeof item.quantity === 'number'
                ? item.quantity
                : parseFloat(String(item.quantity).replace(/[^0-9.-]+/g, ''))
              : 1;

          const result: ScannedBillItem = {
            name: item.name.trim(),
            price: parsedPrice,
            quantity: Number.isFinite(parsedQty) && parsedQty > 0 ? parsedQty : 1,
          };

          return result;
        });

      /**
       * Optional fields.
       *
       * They are NOT given default values.
       */
      const today = new Date().toISOString().split('T')[0];

      const result: ScannedBillResult = {
        merchant: parsed.merchant.trim(),
        amount: parsed.amount,
        category: parsed.category,
        date: today,
        items,
      };

      if (
        parsed.tax !== undefined &&
        parsed.tax !== null
      ) {
        if (
          typeof parsed.tax !== 'number' ||
          !Number.isFinite(parsed.tax)
        ) {
          throw new Error(
            'Invalid bill: Invalid tax value detected.'
          );
        }

        result.tax = parsed.tax;
      }

      if (
        parsed.tip !== undefined &&
        parsed.tip !== null
      ) {
        if (
          typeof parsed.tip !== 'number' ||
          !Number.isFinite(parsed.tip)
        ) {
          throw new Error(
            'Invalid bill: Invalid tip/service charge detected.'
          );
        }

        result.tip = parsed.tip;
      }

      if (
        typeof parsed.note === 'string' &&
        parsed.note.trim() !== ''
      ) {
        result.note = parsed.note.trim();
      }

      return result;
    } catch (error) {
      console.error(
        '[Gemini] Bill scanning failed:',
        error
      );

      throw error;
    }
  }

  /**
   * Realistic presets for testing without an API key.
   */
  private static getPresetResult(
    preset: string
  ): ScannedBillResult {
    const today =
      new Date().toISOString().split('T')[0];

    if (preset === 'supermarket') {
      return {
        merchant: 'Nature Basket Supermarket',
        amount: 1450,
        category: 'Groceries',
        date: today,
        items: [
          {
            name: 'Organic Milk & Farm Eggs',
            price: 350,
            quantity: 2,
          },
          {
            name: 'Fresh Fruits & Greens',
            price: 620,
            quantity: 1,
          },
          {
            name: 'Artisan Sourdough & Snacks',
            price: 480,
            quantity: 1,
          },
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
          {
            name: 'Shell V-Power Petrol (18.5 L)',
            price: 2000,
            quantity: 1,
          },
        ],
        tax: 0,
      };
    }

    if (preset === 'dining') {
      return {
        merchant: 'Barbeque Nation Diner',
        amount: 2800,
        category: 'Dining',
        date: today,
        items: [
          {
            name: '4x Grand Buffet Feast',
            price: 2400,
            quantity: 4,
          },
          {
            name: 'Mocktails & Desserts',
            price: 400,
            quantity: 2,
          },
        ],
        tax: 140,
        tip: 100,
      };
    }

    return {
      merchant: 'Starbucks Coffee',
      amount: 640,
      category: 'Dining',
      date: today,
      items: [
        {
          name: '2x Caffe Latte (Grande)',
          price: 480,
          quantity: 2,
        },
        {
          name: '1x Butter Almond Croissant',
          price: 160,
          quantity: 1,
        },
      ],
      tax: 32,
    };
  }
}