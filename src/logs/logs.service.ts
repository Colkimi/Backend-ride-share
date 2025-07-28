import { Injectable } from '@nestjs/common';
import { promises as fsPromises, existsSync } from 'fs';
import * as path from 'path';

@Injectable()
export class LogsService {
  async logToFile(entry: string, ip?: string) {
    const formattedEntry = `
 ${Intl.DateTimeFormat('en-US', {
   dateStyle: 'short',
   timeStyle: 'short',
   timeZone: 'Africa/Nairobi',
 }).format(new Date())} - IP: ${ip || 'unknown'} - ${entry}\n`;

    try {
      // Use absolute path from process.cwd() for better reliability
      const logsPath = path.join(process.cwd(), 'applogs');
      if (!existsSync(logsPath)) {
        await fsPromises.mkdir(logsPath, { recursive: true });
      }
      await fsPromises.appendFile(
        path.join(logsPath, 'myLogFile.log'),
        formattedEntry,
      );
    } catch (e) {
      if (e instanceof Error) {
        console.error('Error writing log file:', e.message);
      }
    }
  }
}
