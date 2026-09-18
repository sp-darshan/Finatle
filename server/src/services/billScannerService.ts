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
You are a receipt and bill validation and extraction system.

Your task has TWO stages:

STAGE 1 — VALIDATE THE INPUT

Determine whether the provided image/text is a genuine bill, invoice, receipt, purchase receipt, restaurant bill, supermarket bill, fuel receipt, shopping receipt, utility bill, or another legitimate transaction document.

A valid bill should contain meaningful transaction-related information such as:
- Merchant/store/business name
- Purchased goods or services
- Transaction amount/total
- Receipt or invoice information
- Date or transaction details
- Tax/payment information
- Itemized purchase information

INVALID examples:
- Selfies
- Human photographs
- Animals
- Landscapes
- Screenshots unrelated to purchases
- Random documents
- Blank images
- Completely unreadable images
- Advertisements
- Product photographs without transaction information
- Menus without a transaction
- Text that is not a bill or receipt

If the input is NOT a bill or receipt, return:

{
  "validBill": false
}

Do not extract or invent receipt information for an invalid bill.

STAGE 2 — EXTRACT DATA

Only if the input is a valid bill/receipt, extract the following:

{
  "validBill": true,
  "merchant": "string",
  "amount": 0,
  "category": "Dining",
  "items": [
    {
      "name": "string",
      "price": 0,
      "quantity": 1
    }
  ],
  "tax": 0,
  "tip": 0,
  "note": "string"
}

RULES:

1. Extract information ONLY from the provided bill/receipt.

2. NEVER invent, guess, or fabricate information.

3. Do NOT use default values.

4. merchant must be the actual merchant/store/business name visible on the receipt.

5. amount must be the final payable transaction amount shown on the receipt.

6. items must contain the actual purchased products/services visible on the receipt.

9. price must be the actual item price.

10. quantity should be included only when it can be determined from the receipt.

11. tax should be included only when tax/GST/VAT is visible.

12. tip should be included only when tip/service charge is visible.

13. note should contain useful additional transaction information only when present.

14. category MUST be one of:
   - Dining
   - Shopping
   - Rent
   - Travel
   - Entertainment
   - Utilities
   - Health
   - Medical
   - Groceries
   - Personal
   - Other

15. If a required field cannot be reliably determined from a valid bill, set:
   "validBill": false

16. Do not treat a menu, catalog, price list, advertisement, or product image as a bill.

17. Do not treat an ordinary text document as a bill unless it clearly represents a transaction.

18. Return ONLY valid JSON.

19. Do NOT wrap the JSON in markdown.

20. Do NOT include explanations outside the JSON.

VALID BILL EXAMPLE:

{
  "validBill": true,
  "merchant": "ABC Supermarket",
  "amount": 1250,
  "category": "Groceries",
  "date": "2026-09-18",
  "items": [
    {
      "name": "Milk",
      "price": 60,
      "quantity": 2
    }
  ],
  "tax": 60,
  "tip": 0
}

INVALID BILL EXAMPLE:

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

          if (
            item.price === undefined ||
            item.price === null ||
            typeof item.price !== 'number' ||
            !Number.isFinite(item.price)
          ) {
            throw new Error(
              'Invalid bill: One or more item prices could not be identified.'
            );
          }

          const result: ScannedBillItem = {
            name: item.name.trim(),
            price: item.price,
          };

          if (
            item.quantity !== undefined &&
            item.quantity !== null
          ) {
            if (
              typeof item.quantity !== 'number' ||
              !Number.isFinite(item.quantity)
            ) {
              throw new Error(
                'Invalid bill: Invalid item quantity detected.'
              );
            }

            result.quantity = item.quantity;
          }

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