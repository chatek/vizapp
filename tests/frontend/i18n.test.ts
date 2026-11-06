import { describe, expect, it } from 'vitest'
import { resolveLocale, translate } from '../../src/lib/i18n'

describe('i18n', () => {
  it('detects Simplified Chinese system locales without treating Traditional Chinese as Simplified', () => {
    expect(resolveLocale('system', ['zh-CN'])).toBe('zh-CN')
    expect(resolveLocale('system', ['zh-Hans-US'])).toBe('zh-CN')
    expect(resolveLocale('system', ['zh-TW', 'en-US'])).toBe('en')
    expect(resolveLocale('system', ['fr-FR', 'zh-SG'])).toBe('zh-CN')
  })

  it('uses the first supported system locale in preference order', () => {
    expect(resolveLocale('system', ['en-US', 'bg-US', 'zh-Hans-US'])).toBe('en')
    expect(resolveLocale('system', ['zh-Hans-US', 'en-US'])).toBe('zh-CN')
  })

  it('honors an explicit locale preference over the system locale', () => {
    expect(resolveLocale('en', ['zh-CN'])).toBe('en')
    expect(resolveLocale('zh-CN', ['en-US'])).toBe('zh-CN')
  })

  it('ships every composer suggestion string in both catalogs', () => {
    const keys = [
      'composer.suggest.badge',
      'composer.suggest.badgeLabel',
      'composer.suggest.list',
      'composer.suggest.source.human',
      'composer.suggest.source.agent',
      'composer.suggest.source.agentOf',
      'composer.suggest.accept',
      'composer.suggest.inserted',
    ] as const
    for (const key of keys) {
      const english = translate('en', key, { count: 1, source: 'agent', handle: 'teacher' })
      const chinese = translate('zh-CN', key, { count: 1, source: 'agent', handle: 'teacher' })
      expect(english, key).not.toBe(key)
      expect(chinese, key).not.toBe(key)
      expect(chinese, key).not.toBe(english)
    }
    // The badge's singular/plural selection is wired to the count, not to the locale.
    expect(translate('en', 'composer.suggest.badge', { count: 1, source: 'agent' })).toBe('1 suggestion from agent')
    expect(translate('en', 'composer.suggest.badge', { count: 2, source: 'agent' })).toBe('2 suggestions from agent')
  })

  it('interpolates values, selects plural forms, and falls back to English', () => {
    expect(translate('en', 'appearance.language.available', { count: 1 })).toBe('1 language available')
    expect(translate('en', 'appearance.language.available', { count: 2 })).toBe('2 languages available')
    expect(translate('zh-CN', 'appearance.language.available', { count: 2 })).toBe('支持 2 种语言')
    expect(translate('zh-CN', 'common.reload')).toBe('Reload VClaw')
  })
})
