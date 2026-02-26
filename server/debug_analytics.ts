import 'dotenv/config';
import { BIService } from './src/services/bi.service.js';
import dayjs from 'dayjs';

async function test() {
  try {
    console.log('Testing Dashboard Analytics with specific dates...');
    const result = await BIService.getDashboardAnalytics('2026-02-20', '2026-02-26');
    console.log('Success:', JSON.stringify(result, (key, value) =>
      typeof value === 'bigint' ? value.toString() : value, 2));
  } catch (err) {
    console.error('Error Details:', err);
  }
}

test();
