export type Article = 'der' | 'die' | 'das'

export interface Word {
  id: string
  de: string
  article?: Article
  plural?: string
  pluralOnly?: boolean
  en: string
  pos: 'noun' | 'verb' | 'adj' | 'adv' | 'phrase'
  example: string
  /** The exact form of the word as it appears in `example` (defaults to `de`). */
  cloze?: string
}

export interface Character {
  name: string
  role: string
  emoji: string
  patience: number
  /** What they say when patience runs out. */
  kickout: string
}

export interface SceneLine {
  who: 'npc' | 'you'
  /** Highlight words with {wordId|surface text}. */
  text: string
}

export interface KollokationItem {
  phrase: string
  answer: string
  options: string[]
  en: string
}

export interface GespraechItem {
  npc: string
  task: string
  options: { text: string; ok: boolean; why: string }[]
}

export interface SchmiedeItem {
  en: string
  target: string
  tiles: string[]
}

export type Encounter =
  | { type: 'artikel'; words: string[] }
  | { type: 'lueckentext'; words: string[] }
  | { type: 'kollokation'; items: KollokationItem[] }
  | { type: 'gespraech'; items: GespraechItem[] }
  | { type: 'schmiede'; items: SchmiedeItem[] }

export interface Station {
  id: string
  name: string
  character: Character
  words: string[]
  scene: SceneLine[]
  encounters: Encounter[]
}

export interface BossItem {
  npc: string
  you: string
  answers: string[]
  /** Accepted, but flagged as too colloquial for the office. */
  casual?: string[]
  wordId?: string
  hint: string
}

export interface RegisterItem {
  casual: string
  answers: string[]
  sentence: string
  en: string
}

export interface District {
  id: string
  name: string
  subtitle: string
  line: string
  color: string
  /** Districts that need at least one star before this one opens. */
  requires?: string[]
  /** Bonus lines are optional extras outside the main progression. */
  bonus?: boolean
  words: Word[]
  stations: Station[]
  boss: {
    name: string
    character: Character
    intro: string
    seconds: number
    winTitle: string
    winText: string
    items: BossItem[]
  }
  challenge: {
    name: string
    intro: string
    character: Character
    winTitle: string
    winText: string
    /** Shown when the player types the everyday word instead of the target. */
    nearMissNote: string
    items: RegisterItem[]
  }
}

export interface Result {
  wordId?: string
  correct: boolean
}
