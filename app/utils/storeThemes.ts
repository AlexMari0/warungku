/**
 * Storefront Color Theme Utilities
 */

export interface StoreThemeClasses {
  primaryText: string
  primaryBg: string
  buttonBg: string
  ringColor: string
  accentBorder: string
  glowGlow: string
  textColor: string
  bgLight: string
  isCustom: boolean
  customColor: string
}

export const STORE_THEME_MAP: Record<string, Omit<StoreThemeClasses, 'isCustom' | 'customColor'>> = {
  emerald: {
    primaryText: 'text-emerald-600 dark:text-emerald-400',
    primaryBg: 'bg-emerald-50 dark:bg-emerald-950/30',
    buttonBg: 'bg-emerald-600 hover:bg-emerald-700',
    ringColor: 'focus:ring-emerald-500/30',
    accentBorder: 'border-emerald-500/20 dark:border-emerald-400/20',
    glowGlow: 'rgba(16,185,129,0.12)',
    textColor: 'text-emerald-500',
    bgLight: 'bg-emerald-500/10'
  },
  sky: {
    primaryText: 'text-sky-600 dark:text-sky-400',
    primaryBg: 'bg-sky-50 dark:bg-sky-950/30',
    buttonBg: 'bg-sky-600 hover:bg-sky-700',
    ringColor: 'focus:ring-sky-500/30',
    accentBorder: 'border-sky-500/20 dark:border-sky-400/20',
    glowGlow: 'rgba(14,165,233,0.12)',
    textColor: 'text-sky-500',
    bgLight: 'bg-sky-500/10'
  },
  amber: {
    primaryText: 'text-amber-600 dark:text-amber-400',
    primaryBg: 'bg-amber-50 dark:bg-amber-950/30',
    buttonBg: 'bg-amber-600 hover:bg-amber-700',
    ringColor: 'focus:ring-amber-500/30',
    accentBorder: 'border-amber-500/20 dark:border-amber-400/20',
    glowGlow: 'rgba(245,158,11,0.12)',
    textColor: 'text-amber-500',
    bgLight: 'bg-amber-500/10'
  },
  rose: {
    primaryText: 'text-rose-600 dark:text-rose-400',
    primaryBg: 'bg-rose-50 dark:bg-rose-950/30',
    buttonBg: 'bg-rose-600 hover:bg-rose-700',
    ringColor: 'focus:ring-rose-500/30',
    accentBorder: 'border-rose-500/20 dark:border-rose-400/20',
    glowGlow: 'rgba(244,63,94,0.12)',
    textColor: 'text-rose-500',
    bgLight: 'bg-rose-500/10'
  },
  slate: {
    primaryText: 'text-slate-600 dark:text-slate-400',
    primaryBg: 'bg-slate-50 dark:bg-slate-950/30',
    buttonBg: 'bg-slate-600 hover:bg-slate-700',
    ringColor: 'focus:ring-slate-500/30',
    accentBorder: 'border-slate-500/20 dark:border-slate-400/20',
    glowGlow: 'rgba(100,116,139,0.12)',
    textColor: 'text-slate-500',
    bgLight: 'bg-slate-500/10'
  }
}

export function getStoreThemeClasses(themeColor = 'emerald'): StoreThemeClasses {
  if (themeColor.startsWith('#')) {
    return {
      primaryText: 'text-primary',
      primaryBg: 'bg-primary/10',
      buttonBg: 'bg-primary hover:bg-primary/90',
      ringColor: 'focus:ring-primary/30',
      accentBorder: 'border-primary/20',
      glowGlow: themeColor + '1F',
      textColor: 'text-primary',
      bgLight: 'bg-primary/10',
      isCustom: true,
      customColor: themeColor
    }
  }

  const base = STORE_THEME_MAP[themeColor] || STORE_THEME_MAP.emerald
  return {
    ...base!,
    isCustom: false,
    customColor: ''
  }
}
