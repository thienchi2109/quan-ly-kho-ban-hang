
'use server';
/**
 * @fileOverview An AI agent for extracting information from handwritten import notes.
 *
 * - extractImportNoteInfo - A function that handles the import note information extraction process.
 * - ExtractImportNoteInput - The input type for the extractImportNoteInfo function.
 * - ExtractImportNoteOutput - The return type for the extractImportNoteInfo function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const ExtractImportNoteInputSchema = z.object({
  imageDataUri: z
    .string()
    .describe(
      "A photo of a handwritten import note, as a data URI that must include a MIME type and use Base64 encoding. Expected format: 'data:<mimetype>;base64,<encoded_data>'."
    ),
});
export type ExtractImportNoteInput = z.infer<typeof ExtractImportNoteInputSchema>;

const ExtractedItemSchema = z.object({
  productNameGuess: z.string().describe("The name of the product as interpreted from the image. This is a best-effort guess."),
  quantity: z.number().int().min(1).describe("The quantity of the product identified. Must be an integer greater than or equal to 1."),
});

const ExtractImportNoteOutputSchema = z.object({
  date: z.string().optional().describe("The date extracted from the note in YYYY-MM-DD format. If multiple dates are present, choose the most prominent one likely to be the import date."),
  supplierName: z.string().optional().describe("The name of the supplier, if identifiable from the note."),
  notes: z.string().optional().describe("Any other relevant notes or text extracted from the import slip."),
  items: z.array(ExtractedItemSchema).optional().describe("A list of items (product name guesses and quantities) extracted from the note."),
});
export type ExtractImportNoteOutput = z.infer<typeof ExtractImportNoteOutputSchema>;

export async function extractImportNoteInfo(input: ExtractImportNoteInput): Promise<ExtractImportNoteOutput> {
  return extractImportNoteInfoFlow(input);
}

const prompt = ai.definePrompt({
  name: 'extractImportNotePrompt',
  input: {schema: ExtractImportNoteInputSchema},
  output: {schema: ExtractImportNoteOutputSchema},
  prompt: `You are an expert AI assistant specialized in analyzing images of handwritten or printed import/stock receiving notes. Your task is to extract key information from the provided image.

The image contains a phiếu nhập kho (import note). Please identify the following details:

1.  **Date (Ngày nhập):** Look for a date on the note. Format it as YYYY-MM-DD. If there are multiple dates, try to determine the most relevant one for the import.
2.  **Supplier Name (Nhà Cung Cấp):** Identify the name of the supplier or vendor, if mentioned.
3.  **Items (Sản Phẩm và Số Lượng):**
    *   Identify each distinct product or item listed.
    *   For each product, extract its name (as accurately as possible, even if handwritten and potentially misspelled - provide the best guess for productNameGuess).
    *   Extract the quantity associated with each product. Ensure quantity is an integer and at least 1.
    *   List these as an array of objects, where each object has "productNameGuess" and "quantity".
4.  **Notes (Ghi Chú):** Extract any other relevant text, comments, or miscellaneous information from the note.

Prioritize accuracy. If some information is unclear or not present, omit it from the corresponding field in the output rather than guessing.

Image to analyze:
{{media url=imageDataUri}}

Provide the output in the specified JSON format.
Example of a good item extraction from a line like "Bút bi Thiên Long x 20":
{ "productNameGuess": "Bút bi Thiên Long", "quantity": 20 }
Example of a good item extraction from "Vở ABC - 50 cuốn":
{ "productNameGuess": "Vở ABC", "quantity": 50 }
If a line only says "Sách giáo khoa", without quantity, do not include it in items. Quantity is mandatory for an item and must be >= 1.
`,
});

const extractImportNoteInfoFlow = ai.defineFlow(
  {
    name: 'extractImportNoteInfoFlow',
    inputSchema: ExtractImportNoteInputSchema,
    outputSchema: ExtractImportNoteOutputSchema,
  },
  async (input) => {
    const {output} = await prompt(input);
    // Basic validation or transformation could happen here if needed
    // For example, ensuring date format if AI provides it differently.
    // For now, we trust the model to adhere to the output schema.
    return output!;
  }
);

