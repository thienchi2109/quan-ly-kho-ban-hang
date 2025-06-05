// FinancialForecasting story: As a user, I want to be able to see AI-powered forecasts based on my income and expense data so I can make informed financial decisions.

'use server';

/**
 * @fileOverview Provides AI-powered financial forecasts based on user's income and expense data.
 *
 * - financialForecast - A function that generates financial forecasts.
 * - FinancialForecastInput - The input type for the financialForecast function.
 * - FinancialForecastOutput - The return type for the financialForecast function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const FinancialForecastInputSchema = z.object({
  incomeData: z
    .string()
    .describe(
      'Historical income data as a JSON string, with date and amount fields. Example: [{"date": "2024-01-01", "amount": 5000}, {"date": "2024-01-08", "amount": 6000}]'
    ),
  expenseData: z
    .string()
    .describe(
      'Historical expense data as a JSON string, with date and amount fields. Example: [{"date": "2024-01-03", "amount": 1000}, {"date": "2024-01-10", "amount": 1200}]'
    ),
});
export type FinancialForecastInput = z.infer<typeof FinancialForecastInputSchema>;

const FinancialForecastOutputSchema = z.object({
  forecastSummary: z
    .string()
    .describe('A summary of the financial forecast, including potential future income and expenses.'),
  recommendations: z
    .string()
    .describe('Recommendations for improving financial health based on the forecast.'),
});
export type FinancialForecastOutput = z.infer<typeof FinancialForecastOutputSchema>;

export async function financialForecast(input: FinancialForecastInput): Promise<FinancialForecastOutput> {
  return financialForecastFlow(input);
}

const prompt = ai.definePrompt({
  name: 'financialForecastPrompt',
  input: {schema: FinancialForecastInputSchema},
  output: {schema: FinancialForecastOutputSchema},
  prompt: `You are a financial advisor providing forecasts and recommendations based on income and expense data.
  Your user is Vietnamese. Please provide all answers, summaries, and recommendations in Vietnamese.

  Analyze the provided income and expense data to predict future financial trends. Provide a summary of your forecast, and include actionable recommendations for the user to improve their financial health.

  Income Data: {{{incomeData}}}
  Expense Data: {{{expenseData}}}`,
});

const financialForecastFlow = ai.defineFlow(
  {
    name: 'financialForecastFlow',
    inputSchema: FinancialForecastInputSchema,
    outputSchema: FinancialForecastOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
