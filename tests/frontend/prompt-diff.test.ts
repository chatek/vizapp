import { describe, expect, it } from 'vitest'
import { diffPrompts, tokenizePrompt } from '../../src/lib/prompt-diff'

const text = (parts: ReturnType<typeof diffPrompts>, kind: 'same' | 'insert'): string =>
  parts.filter((part) => part.kind === kind).map((part) => part.text).join('')

describe('prompt diff', () => {
  it('splits CJK per ideograph and keeps words whole', () => {
    expect(tokenizePrompt('一元二次方程')).toEqual(['一', '元', '二', '次', '方', '程'])
    expect(tokenizePrompt("solve the quadratic equation, don't guess")).toEqual(
      ['solve', ' ', 'the', ' ', 'quadratic', ' ', 'equation', ',', ' ', "don't", ' ', 'guess'],
    )
  })

  it('shows an empty draft as one whole insertion', () => {
    expect(diffPrompts('', '求解一元二次方程')).toEqual([{ kind: 'insert', text: '求解一元二次方程' }])
    expect(diffPrompts('', '')).toEqual([])
  })

  it('marks only what accepting would add to the Chinese draft', () => {
    const parts = diffPrompts('一元二次方程', '求解一元二次方程的最优提示')
    expect(text(parts, 'same')).toContain('一元二次方程')
    expect(text(parts, 'insert')).toContain('求解')
    expect(text(parts, 'insert')).toContain('的最优提示')
    expect(text(parts, 'insert')).not.toContain('一元二次方程')
  })

  it('keeps a draft the teacher did not change entirely plain', () => {
    expect(diffPrompts('quadratic equation', 'quadratic equation')).toEqual([{ kind: 'same', text: 'quadratic equation' }])
    expect(text(diffPrompts('solve it', 'solve it step by step'), 'same')).toBe('solve it')
  })

  it('falls back to a whole insertion instead of building an LCS table over a huge draft', () => {
    const huge = 'x '.repeat(500)
    const parts = diffPrompts(huge, `${huge} and more`)
    expect(parts).toEqual([{ kind: 'insert', text: `${huge} and more` }])
  })
})
