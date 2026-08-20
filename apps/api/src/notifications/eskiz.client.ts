import { Injectable, Logger } from '@nestjs/common';

const ESKIZ_BASE_URL = 'https://notify.eskiz.uz/api';
/** Eskiz tokeni ~30 kun yashaydi; ertaroq yangilaymiz */
const TOKEN_TTL_MS = 25 * 24 * 60 * 60 * 1000;

export type SmsSendResult = { sent: boolean; error?: string };

/**
 * Eskiz.uz SMS shlyuzi. Token xotirada saqlanadi va 401 da bir marta
 * qayta olinadi — har bir SMS uchun login qilish shart emas.
 */
@Injectable()
export class EskizClient {
  private readonly logger = new Logger(EskizClient.name);
  private token: string | null = null;
  private tokenExpiresAt = 0;
  private loginPromise: Promise<string | null> | null = null;

  isConfigured() {
    return Boolean(process.env.ESKIZ_EMAIL && process.env.ESKIZ_PASSWORD);
  }

  async send(phone: string, message: string): Promise<SmsSendResult> {
    if (!this.isConfigured()) {
      this.logger.warn('Eskiz sozlanmagan (ESKIZ_EMAIL / ESKIZ_PASSWORD)');
      return { sent: false, error: 'not_configured' };
    }

    const first = await this.post(phone, message);
    if (first.status !== 401) return this.toResult(first);

    // Token eskirgan — bir marta qayta login qilib takrorlaymiz
    this.token = null;
    this.tokenExpiresAt = 0;
    const retry = await this.post(phone, message);
    return this.toResult(retry);
  }

  private async post(phone: string, message: string) {
    const token = await this.getToken();
    if (!token) return { status: 0, body: 'login_failed' };

    try {
      const res = await fetch(`${ESKIZ_BASE_URL}/message/sms/send`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          mobile_phone: phone.replace(/\D/g, ''),
          message,
          from: process.env.ESKIZ_FROM ?? '4546',
        }),
      });
      return { status: res.status, body: await res.text() };
    } catch (err) {
      this.logger.error('Eskiz so\'rovi bajarilmadi', err);
      return { status: 0, body: 'network_error' };
    }
  }

  private toResult({ status, body }: { status: number; body: string }): SmsSendResult {
    if (status >= 200 && status < 300) return { sent: true };
    this.logger.error(`Eskiz SMS yuborilmadi (${status}): ${body}`);
    return { sent: false, error: `http_${status}` };
  }

  private async getToken() {
    if (this.token && Date.now() < this.tokenExpiresAt) return this.token;
    // Bir vaqtda kelgan SMS lar bitta login so'roviga birlashadi
    if (!this.loginPromise) {
      this.loginPromise = this.login().finally(() => {
        this.loginPromise = null;
      });
    }
    return this.loginPromise;
  }

  private async login(): Promise<string | null> {
    try {
      const body = new URLSearchParams({
        email: process.env.ESKIZ_EMAIL ?? '',
        password: process.env.ESKIZ_PASSWORD ?? '',
      });
      const res = await fetch(`${ESKIZ_BASE_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body,
      });
      if (!res.ok) {
        this.logger.error(`Eskiz login xatosi (${res.status}): ${await res.text()}`);
        return null;
      }

      const json = (await res.json()) as { data?: { token?: string } };
      const token = json.data?.token;
      if (!token) {
        this.logger.error('Eskiz javobida token yo\'q');
        return null;
      }

      this.token = token;
      this.tokenExpiresAt = Date.now() + TOKEN_TTL_MS;
      return token;
    } catch (err) {
      this.logger.error('Eskiz login bajarilmadi', err);
      return null;
    }
  }
}
