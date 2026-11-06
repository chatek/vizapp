// @vitest-environment jsdom

import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { Composer } from '../../src/components/Composer'
import type { PrimeWorkApi, PromptSuggestion } from '../../src/types/api'

globalThis.IS_REACT_ACT_ENVIRONMENT = true

/**
 * §4 keyboard/IME contract for the suggestion listbox. The composer is the only place that can
 * enforce it: the editor knows whether the student is mid-word or mid-composition, and the main
 * process only knows what was pushed.
 */
const suggestion = (overrides: Partial<PromptSuggestion> = {}): PromptSuggestion => ({
  suggestionId: 'sug-1',
  roomId: 'room-1',
  requestId: 'req-1',
  prompt: '求解一元二次方程的最优提示',
  from: { kind: 'human', nkey: 'UTEACHERKEY', display: 'teacher' },
  expiresAt: '2099-01-01T00:00:00.000Z',
  ...overrides,
})

/** jsdom has no preload bridge; this is the one place that fabricates `window.prime`. */
const stubWindow = window as unknown as { prime?: PrimeWorkApi }

let container: HTMLDivElement
let root: Root
let push: ((value: PromptSuggestion) => void) | null
let feedback: ReturnType<typeof vi.fn>
let draft: ReturnType<typeof vi.fn>

function stubPreload(): void {
  push = null
  feedback = vi.fn(async () => ({ ok: true, data: { ok: true } }))
  draft = vi.fn()
  const suggestions = {
    subscribe: (callback: (value: PromptSuggestion) => void) => {
      push = callback
      return () => { push = null }
    },
    draft,
    consent: vi.fn(),
    openSession: vi.fn(),
    closeSession: vi.fn(),
    feedback,
  }
  stubWindow.prime = { suggestions } as unknown as PrimeWorkApi
}

function renderComposer(): void {
  act(() => root.render(<Composer
    busy={false}
    model="auto"
    effort="medium"
    modelsByProvider={new Map()}
    providers={[]}
    reasoningLevels={['medium']}
    fast={false}
    fastSupported={false}
    fastAvailable={false}
    imageInputSupported
    skills={[]}
    onModelChange={vi.fn()}
    onEffortChange={vi.fn()}
    onFastChange={vi.fn()}
    onSend={vi.fn()}
    onStop={vi.fn()}
  />))
}

const textareaOf = (): HTMLTextAreaElement => container.querySelector('textarea') as HTMLTextAreaElement

async function type(value: string): Promise<void> {
  const textarea = textareaOf()
  await act(async () => {
    const setter = Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value')?.set
    setter?.call(textarea, value)
    textarea.dispatchEvent(new Event('input', { bubbles: true }))
  })
}

async function arrive(value: PromptSuggestion): Promise<void> {
  await act(async () => {
    push?.(value)
  })
}

async function press(key: string, init: KeyboardEventInit = {}): Promise<void> {
  await act(async () => {
    textareaOf().dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true, ...init }))
  })
}

async function idle(ms = 200): Promise<void> {
  const { promise, resolve } = Promise.withResolvers<void>()
  setTimeout(resolve, ms)
  await act(async () => { await promise })
}

beforeEach(() => {
  stubPreload()
  container = document.createElement('div')
  document.body.append(container)
  root = createRoot(container)
})

afterEach(() => {
  act(() => root.unmount())
  container.remove()
  delete stubWindow.prime
})

describe('composer suggestion list', () => {
  it('opens on arrival after an idle draft and accepts the prompt on Tab', async () => {
    renderComposer()
    await arrive(suggestion())

    const menu = container.querySelector('.composer-menu')
    expect(menu?.getAttribute('role')).toBe('listbox')
    expect(menu?.textContent).toContain('求解一元二次方程的最优提示')

    await press('Tab')

    expect(textareaOf().value).toBe('求解一元二次方程的最优提示')
    expect(container.querySelector('.composer-menu')).toBeNull()
    expect(feedback).toHaveBeenCalledWith('sug-1', 'accepted')
  })

  it('replaces the current selection instead of appending', async () => {
    renderComposer()
    await type('一元二次方程')
    await arrive(suggestion())
    await idle()

    const textarea = textareaOf()
    await act(async () => {
      textarea.setSelectionRange(0, textarea.value.length)
      textarea.dispatchEvent(new Event('select', { bubbles: true }))
    })
    await press('Enter')

    expect(textareaOf().value).toBe('求解一元二次方程的最优提示')
    expect(feedback).toHaveBeenCalledWith('sug-1', 'accepted')
  })

  it('labels the source and marks only the text accepting would add', async () => {
    renderComposer()
    await type('一元二次方程')
    await arrive(suggestion())
    await idle()

    const chip = container.querySelector('.composer-suggest__chip')
    expect(chip?.textContent).toBe('human @teacher')
    const marks = [...container.querySelectorAll('.composer-suggest__text mark')].map((mark) => mark.textContent ?? '')
    expect(marks.join('')).toContain('求解')
    expect(marks.join('')).toContain('最优提示')
    expect(marks.join('')).not.toContain('一元二次方程')
  })

  it('marks an agent suggestion as an agent and keeps its owner as a claim', async () => {
    renderComposer()
    await arrive(suggestion({ suggestionId: 'sug-agent', from: { kind: 'agent', nkey: 'UAGENT', ownerHandle: 'teacher' } }))

    expect(container.querySelector('.composer-suggest__chip--agent')?.textContent).toBe('agent · @teacher')
  })

  it('dismisses with Escape and records the rejection', async () => {
    renderComposer()
    await arrive(suggestion())
    expect(container.querySelector('.composer-menu')).not.toBeNull()

    await press('Escape')

    expect(container.querySelector('.composer-menu')).toBeNull()
    expect(textareaOf().value).toBe('')
    expect(feedback).toHaveBeenCalledWith('sug-1', 'rejected')
  })

  it('parks an arrival behind a quiet badge while the draft is being typed', async () => {
    renderComposer()
    await type('一元二次方程')
    await arrive(suggestion())

    expect(container.querySelector('.composer-menu')).toBeNull()
    const badge = container.querySelector('.composer-suggest-badge') as HTMLButtonElement
    expect(badge.textContent).toContain('1 suggestion from human @teacher')

    await act(async () => badge.click())
    expect(container.querySelector('.composer-menu')).not.toBeNull()
    expect(container.querySelectorAll('[role="option"]')).toHaveLength(1)
  })

  it('publishes the draft to the main process without waiting for a reply', async () => {
    renderComposer()
    await type('一元二次方程')
    expect(draft).toHaveBeenCalledWith(expect.objectContaining({ text: '一元二次方程', locale: 'en' }))
  })
})

describe('composer suggestion IME safety', () => {
  async function composeStart(): Promise<void> {
    await act(async () => {
      textareaOf().dispatchEvent(new CompositionEvent('compositionstart', { bubbles: true }))
    })
  }
  async function composeEnd(value: string): Promise<void> {
    await act(async () => {
      const textarea = textareaOf()
      const setter = Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value')?.set
      setter?.call(textarea, value)
      textarea.dispatchEvent(new CompositionEvent('compositionend', { bubbles: true, data: value }))
      textarea.dispatchEvent(new Event('input', { bubbles: true }))
    })
  }

  it('never opens the list for a suggestion that lands mid-composition', async () => {
    renderComposer()
    await composeStart()
    await arrive(suggestion())
    await idle()

    expect(container.querySelector('.composer-menu')).toBeNull()
    expect(container.querySelector('.composer-suggest-badge')).not.toBeNull()
    await composeEnd('一元二次方程')
  })

  it('never steers or accepts the list with Arrow/Tab/Enter during a composition', async () => {
    renderComposer()
    await arrive(suggestion({ suggestionId: 'sug-a', prompt: 'first prompt' }))
    await arrive(suggestion({ suggestionId: 'sug-b', prompt: 'second prompt' }))
    const options = (): Element[] => [...container.querySelectorAll('[role="option"]')]
    expect(options()).toHaveLength(2)
    expect(options()[0].getAttribute('aria-selected')).toBe('true')

    await composeStart()
    await press('ArrowDown')
    await press('Tab')
    await press('Enter')

    expect(options()[0].getAttribute('aria-selected')).toBe('true')
    expect(options()[1].getAttribute('aria-selected')).toBe('false')
    expect(textareaOf().value).toBe('')
    expect(feedback).not.toHaveBeenCalled()
    await composeEnd('一元二次方程')
  })

  it('keeps the menu closed when Enter commits an IME candidate', async () => {
    renderComposer()
    await arrive(suggestion())
    await composeStart()
    await press('Enter', { isComposing: true })
    expect(textareaOf().value).toBe('')
    expect(feedback).not.toHaveBeenCalled()
  })
})
