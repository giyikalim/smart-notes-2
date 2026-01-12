import { getRequestConfig } from 'next-intl/server';
import { cookies, headers } from 'next/headers';

const locales = ['en', 'tr', 'de'] as const;
type Locale = (typeof locales)[number];
const defaultLocale: Locale = 'tr';

export default getRequestConfig(async () => {
  const cookieStore = await cookies();
  const headersList = await headers();
  
  const cookieLocale = cookieStore.get('NEXT_LOCALE')?.value;
  const acceptLanguage = headersList.get('accept-language');
  
  let locale: Locale = defaultLocale;
  
  if (cookieLocale && locales.includes(cookieLocale as Locale)) {
    locale = cookieLocale as Locale;
  } else if (acceptLanguage) {
    const preferredLocale = acceptLanguage
      .split(',')[0]
      .split('-')[0]
      .toLowerCase();
    if (locales.includes(preferredLocale as Locale)) {
      locale = preferredLocale as Locale;
    }
  }

  return {
    locale,
    messages: (await import(`@/messages/${locale}.json`)).default,
  };
});
