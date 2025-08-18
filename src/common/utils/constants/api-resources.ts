const isProd = process.env.NODE_ENV === 'production';

export const PAYSTACK_BASE_URL = 'https://api.paystack.co/transaction';

export const PAYSTACK_CALLBACK_URL = isProd
  ? 'https://your-production-domain.com/payment/ad/success'
  : 'http://localhost:3001/payment/ad/success';

export const AD_PAYMENT_URL = isProd
  ? 'https://your-production-domain.com/payment/ad'
  : 'http://localhost:3001/payment/ad';

export const VIEW_AD_URL = isProd
  ? 'https://your-production-domain.com/advertise/ad-performance'
  : 'http://localhost:3001/advertise/ad-performance';

export const DASHBOARD_URL = isProd
  ? 'https://your-production-domain.com/home'
  : 'http://localhost:3001/home';
