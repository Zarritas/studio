
"use client"

import * as React from "react"
import { Languages } from "lucide-react"
import { useTranslation } from "@/lib/i18n"

import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

export function LanguageSwitcher() {
  const { locale, setLocale, supportedLocales, t } = useTranslation();

  const handleLanguageChange = (langCode: string) => {
    setLocale(langCode);
  }

  const currentLanguageName = supportedLocales.find(l => l.code === locale)?.name || locale;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon">
          <Languages className="h-[1.2rem] w-[1.2rem]" />
          <span className="sr-only">{t('changeLanguage')} - {currentLanguageName}</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {supportedLocales.map((lang) => (
          <DropdownMenuItem key={lang.code} onClick={() => handleLanguageChange(lang.code)}>
            {/* Translates language name if a key like "language.en" exists, otherwise uses provided name */}
            {t(`language.${lang.code}`, {defaultValue: lang.name})} 
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
