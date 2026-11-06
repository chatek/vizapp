/**
 * Word-level diff for the composer's shared-prompt preview.
 *
 * The menu shows what accepting a teacher's suggestion WOULD change, so the unit is the word
 * (plus one CJK ideograph): a student typing `一元二次方程` and a teacher suggesting
 * `求解一元二次方程的最优提示` must see `求解` and `的最优提示` marked, not a whole-line replace.
 *
 * Only INSERTIONS are emitted. Text the draft already has is `same`; text the draft has and the
 * suggestion lacks is simply absent from the preview — striking it through in a 2-line menu row
 * would be noise. Everything here is pure and dependency-free so both the menu and tests can
 * share it.
 */

export interface DiffPart {
  kind: 'same' | 'insert'
  text: string
}

/** Above this many tokens per side the LCS table stops being worth its memory: show it whole. */
const MAX_DIFF_TOKENS = 400

/** One token: a CJK ideograph, whitespace, a run of word characters, or one other character. */
const TOKEN_PATTERN = /[\u3400-\u4dbf\u4e00-\u9fff\uf900-\ufaff]|\s+|[A-Za-z0-9_'-]+|./gu

export function tokenizePrompt(text: string): string[] {
  return text.match(TOKEN_PATTERN) ?? []
}

export function diffPrompts(draft: string, suggestion: string): DiffPart[] {
  if (draft === suggestion) return suggestion ? [{ kind: 'same', text: suggestion }] : []
  if (!draft) return suggestion ? [{ kind: 'insert', text: suggestion }] : []
  const base = tokenizePrompt(draft)
  const incoming = tokenizePrompt(suggestion)
  if (base.length > MAX_DIFF_TOKENS || incoming.length > MAX_DIFF_TOKENS) {
    return [{ kind: 'insert', text: suggestion }]
  }

  // Suffix LCS lengths: lengths[i][j] = LCS(base[i:], incoming[j:]). Flat, one Uint32Array.
  const columns = incoming.length + 1
  const lengths = new Uint32Array((base.length + 1) * columns)
  for (let i = base.length - 1; i >= 0; i -= 1) {
    for (let j = incoming.length - 1; j >= 0; j -= 1) {
      lengths[i * columns + j] = base[i] === incoming[j]
        ? lengths[(i + 1) * columns + j + 1] + 1
        : Math.max(lengths[(i + 1) * columns + j], lengths[i * columns + j + 1])
    }
  }

  const parts: DiffPart[] = []
  const push = (kind: DiffPart['kind'], text: string): void => {
    const last = parts[parts.length - 1]
    if (last && last.kind === kind) last.text += text
    else parts.push({ kind, text })
  }
  let i = 0
  let j = 0
  while (i < base.length && j < incoming.length) {
    if (base[i] === incoming[j]) {
      push('same', incoming[j])
      i += 1
      j += 1
      continue
    }
    // Tie goes to the draft: an unchanged run wins over an insertion, so the marks stay local.
    if (lengths[(i + 1) * columns + j] >= lengths[i * columns + j + 1]) i += 1
    else push('insert', incoming[j++])
  }
  while (j < incoming.length) push('insert', incoming[j++])
  return parts
}
