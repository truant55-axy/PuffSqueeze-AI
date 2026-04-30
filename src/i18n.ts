export type AppLanguage = 'en' | 'zh';

export function tr(language: AppLanguage, en: string, zh: string): string {
  return language === 'zh' ? zh : en;
}
