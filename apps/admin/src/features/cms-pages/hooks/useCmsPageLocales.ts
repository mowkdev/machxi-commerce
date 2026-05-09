import type { PageDetailResponse } from '@repo/types/admin';
import { useEffect, useMemo, useState } from 'react';

import { useLanguageOptions } from '@/features/languages/hooks';

const FALLBACK_LOCALE = 'en';

export function useCmsPageLocales(initialData?: PageDetailResponse) {
  const { data: languages } = useLanguageOptions();

  const defaultLocale = useMemo(() => {
    const fromApi = languages?.find((l) => l.isDefault)?.code ?? languages?.[0]?.code;
    const fromData = initialData?.translations[0]?.languageCode;
    return fromApi ?? fromData ?? FALLBACK_LOCALE;
  }, [languages, initialData]);

  const [selectedLocale, setSelectedLocale] = useState<string>(defaultLocale);

  useEffect(() => {
    setSelectedLocale(defaultLocale);
  }, [defaultLocale]);

  return {
    defaultLocale,
    languages: languages ?? [],
    selectedLocale,
    setSelectedLocale,
  };
}
