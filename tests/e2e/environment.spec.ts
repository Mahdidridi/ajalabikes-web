import { expect, test } from '@playwright/test';
import { requiredApiBaseUrl, requiredSecret } from './helpers/environment';

test('une API absente ou blanche echoue explicitement sans repli local', () => {
  for (const API_BASE_URL of [undefined, '', ' \r\n ']) {
    expect(() => requiredApiBaseUrl({ API_BASE_URL })).toThrow(/API_BASE_URL.*export/);
  }
});

test('le secret absent explique quoi exporter sans fournir de valeur de secours', () => {
  for (const REVALIDATE_SECRET of [undefined, '', ' \r\n ']) {
    expect(() => requiredSecret({ REVALIDATE_SECRET })).toThrow(/REVALIDATE_SECRET.*export/);
  }
});

test('les espaces de copie autour du secret ne passent pas dans Authorization', () => {
  expect(requiredSecret({ REVALIDATE_SECRET: ' secret-fictif\r\n' })).toBe('secret-fictif');
});

test('l URL API explicite est normalisee et les schemas invalides sont refuses', () => {
  expect(requiredApiBaseUrl({ API_BASE_URL: ' https://api.example.test/api/ ' })).toBe('https://api.example.test/api');
  for (const API_BASE_URL of ['api.example.test/api', 'file:///api', 'https://user:password@example.test/api']) {
    expect(() => requiredApiBaseUrl({ API_BASE_URL })).toThrow(/API_BASE_URL/);
  }
});
