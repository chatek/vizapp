// VLink copy — verbatim C literals from the firmware. There is NO i18n in the product
// (every string is a C literal in ui_screens.cpp), so `zh` returns the same text (SPEC A5).
export type Lang = "en" | "zh";

const STRINGS = {
  vlink: "VLink",                                    // ui_screens.cpp:56,115,121
  version: "v1.0.0-c6",                            // "v" VLINK_VERSION (ui_screens.cpp:21,62)
  starting: "starting...",                         // ui_screens.cpp:68 (never a drawable frame)
  noAccount: "NO ACCOUNT",                         // ui_screens.cpp:116
  noAccountHint: "hold BOOT for provisioning state", // ui_screens.cpp:116
  noTime: "NO TIME",                               // ui_screens.cpp:122
  noTimeHint: "set the clock, then hold BOOT",     // ui_screens.cpp:122
  noCode: "------",                                // ui_screens.cpp:129
  accountFallback: "account ",                     // ui_screens.cpp:139 prefix + index
} as const;

export type Key = keyof typeof STRINGS;

let lang: Lang = "en";
export function setStringsLang(l: Lang): void { lang = l; }
export function t(key: Key): string {
  void lang; // one language: the C literals above are the copy in every slot
  return STRINGS[key];
}
