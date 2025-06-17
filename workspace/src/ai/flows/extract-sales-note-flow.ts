
'use server';
/**
 * @fileOverview An AI agent for extracting information from handwritten sales notes/invoices.
 *
 * - extractSalesNoteInfo - A function that handles the sales note information extraction process.
 * - ExtractSalesNoteInput - The input type for the extractSalesNoteInfo function.
 * - ExtractSalesNoteOutput - The return type for the extractSalesNoteInfo function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const ExtractSalesNoteInputSchema = z.object({
  imageDataUri: z
    .string()
    .describe(
      "A photo of a handwritten sales note or simple invoice, as a data URI that must include a MIME type and use Base64 encoding. Expected format: 'data:<mimetype>;base64,<encoded_data>'."
    ),
});
export type ExtractSalesNoteInput = z.infer<typeof ExtractSalesNoteInputSchema>;

const ExtractedSalesItemSchema = z.object({
  productNameGuess: z.string().describe("The name of the product as interpreted from the image. This is a best-effort guess."),
  quantityGuess: z.number().int().min(1).describe("The quantity of the product identified. Must be an integer greater than or equal to 1."),
  unitPriceGuess: z.number().min(0).optional().describe("The unit price of the product, if identifiable from the note."),
});

const ExtractSalesNoteOutputSchema = z.object({
  customerNameGuess: z.string().optional().describe("The name of the customer, if identifiable from the note."),
  dateGuess: z.string().optional().describe("The date extracted from the note in YYYY-MM-DD format. If multiple dates are present, choose the most prominent one likely to be the sales date."),
  notesGuess: z.string().optional().describe("Any other relevant notes or text extracted from the sales slip."),
  extractedItems: z.array(ExtractedSalesItemSchema).optional().describe("A list of items (product name guesses, quantities, and optional unit prices) extracted from the note."),
});
export type ExtractSalesNoteOutput = z.infer<typeof ExtractSalesNoteOutputSchema>;

export async function extractSalesNoteInfo(input: ExtractSalesNoteInput): Promise<ExtractSalesNoteOutput> {
  return extractSalesNoteInfoFlow(input);
}

const prompt = ai.definePrompt({
  name: 'extractSalesNotePrompt',
  input: {schema: ExtractSalesNoteInputSchema},
  output: {schema: ExtractSalesNoteOutputSchema},
  prompt: `You are an expert AI assistant specialized in analyzing images of handwritten or simple printed sales notes, receipts, or invoices. Your task is to extract key information from the provided image.

The image contains a phiếu bán hàng (sales note). Please identify the following details:

1.  **Customer Name (Tên Khách Hàng):** Identify the name of the customer, if mentioned.
2.  **Date (Ngày bán):** Look for a date on the note. Format it as YYYY-MM-DD. If there are multiple dates, try to determine the most relevant one for the sale.
3.  **Items (Sản Phẩm, Số Lượng, và Đơn Giá nếu có):**
    *   Identify each distinct product or item listed.
    *   For each product, extract its name (as accurately as possible, even if handwritten and potentially misspelled - provide the best guess for productNameGuess).
    *   Extract the quantity (quantityGuess) associated with each product. Ensure quantity is an integer and at least 1.
    *   If a unit price (đơn giá) is clearly associated with an item, extract it as unitPriceGuess. If not clear, omit it.
    *   List these as an array of objects, where each object has "productNameGuess", "quantityGuess", and optionally "unitPriceGuess".
4.  **Notes (Ghi Chú):** Extract any other relevant text, comments, or miscellaneous information from the note.

Prioritize accuracy. If some information is unclear or not present, omit it from the corresponding field in the output rather than guessing.
Focus on extracting individual items and their quantities/prices if available.

Image to analyze:
{{media url=imageDataUri}}

Provide the output in the specified JSON format.
Example of good item extraction from a line like "Bút bi Thiên Long x 20, 5000d":
{ "productNameGuess": "Bút bi Thiên Long", "quantityGuess": 20, "unitPriceGuess": 5000 }
Example of good item extraction from "Vở ABC - 50 cuốn":
{ "productNameGuess": "Vở ABC", "quantityGuess": 50 }
If a line only says "Sách giáo khoa", without quantity, do not include it in items. Quantity is mandatory. Unit price is optional.
`,
});

const extractSalesNoteInfoFlow = ai.defineFlow(
  {
    name: 'extractSalesNoteInfoFlow',
    inputSchema: ExtractSalesNoteInputSchema,
    outputSchema: ExtractSalesNoteOutputSchema,
  },
  async (input) => {
    const {output} = await prompt(input);
    return output!;
  }
);
