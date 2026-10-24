export interface MemberSeam {
  id: string
  file: string
  anchor?: string
  anyOf?: string[]
  jsonPath?: string
  expect?: string
  why: string
}

export interface MemberSeamResult {
  id: string
  file: string
  ok: boolean
  detail: string
}

export interface MemberSeamReport {
  version: number
  ok: boolean
  results: MemberSeamResult[]
}

export declare const MEMBER_SEAMS_V1: {
  version: number
  date: string
  consumers: string[]
  seams: MemberSeam[]
  documentedNotPatched: Array<{ id: string; file: string; what: string; note: string }>
}

export declare function verifyMemberSeams(root: string): MemberSeamReport
export declare function reportMemberSeams(root: string): MemberSeamReport
