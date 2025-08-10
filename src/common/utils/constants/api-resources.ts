const isProd = process.env.NODE_ENV === 'production';

export const PAYSTACK_BASE_URL = 'https://api.paystack.co/transaction';

export const PAYSTACK_CALLBACK_URL = isProd
  ? 'https://your-production-domain.com/payment/ad/success'
  : 'http://localhost:3001/payment/ad/success';
