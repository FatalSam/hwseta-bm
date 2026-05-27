import axios from 'axios';
import { environment } from '@/config/environment';

/**
 * Anonymous HWSETA API client for public form fill and short-link resolve.
 * Intentionally has no auth header injection and no session logout on 401.
 */
const publicApiClient = axios.create({
  baseURL: environment.apiUrl,
  headers: {
    'Content-Type': 'application/json',
    Accept: 'application/json',
  },
  timeout: 30000,
});

export default publicApiClient;
