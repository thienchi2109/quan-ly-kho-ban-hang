
import { config } from 'dotenv';
config();

import '@/ai/flows/financial-forecast.ts';
import '@/ai/flows/extract-import-note-flow.ts';
import '@/ai/flows/extract-sales-note-flow.ts'; // Added new sales note flow

