import { Injectable } from '@nestjs/common';

@Injectable()
export class AppService {
  getHello(): string {
    return '🎓 Bimbel Management System API is running!';
  }
}
