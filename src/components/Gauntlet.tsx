import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import type { Character, District, Word } from '../types'
import type { CheckOptions } from '../game/check'
import { awardStars, getState, recordAnswer } from '../game/progress'
import { playFanfare, playRight, playWrong } from '../game/sound'
import { Dots, Gap, Patience, TypedQuestion, shuffle, useEnter } from './ui'
import { clozeOf } from './encounters/Lueckentext'
import { wordMap } from '../data'

interface Question {
  key: string
  npc?: string
  you?: string
  /** Free-form prompt for questions that aren't a dialogue. */
  render?: (fill: string | undefined, state: 'ok' | 'bad' | undefined) => ReactNode
  hint?: string
  answers: string[]
  options?: CheckOptions
  word?: Word
}

interface Props {
  district: District
  title: string
  character?: Character
  intro: ReactNode
  questions: Question[]
  seconds?: number
  winTitle: string
  winText: (mistakes: number) => ReactNode
  onWin: (mistakes: number) => void
  onExit: () => void
}

/** A run of typed questions — used for the boss, the Amtsdeutsch challenge and fog reviews. */
function Gauntlet({ district, title, character, intro, questions, seconds, winTitle, winText, onWin, onExit }: Props) {
  const [phase, setPhase] = useState<'intro' | 'play' | 'won' | 'lost'>('intro')
  const [i, setI] = useState(0)
  const [patience, setPatience] = useState(character?.patience ?? Infinity)
  const patienceRef = useRef(patience)
  patienceRef.current = patience
  const [mistakes, setMistakes] = useState(0)
  const [combo, setCombo] = useState(0)
  const [attempt, setAttempt] = useState(0)
  const q = questions[i]

  useEffect(() => {
    if (patience <= 0 && phase === 'play') {
      const t = setTimeout(() => setPhase('lost'), 1200)
      return () => clearTimeout(t)
    }
  }, [patience, phase])

  const judged = (ok: boolean) => {
    recordAnswer(q.word?.id, ok, district.id)
    if (ok) {
      setCombo(combo + 1)
      playRight(combo + 1)
    } else {
      setCombo(0)
      playWrong()
      setMistakes((m) => m + 1)
      setPatience((p) => p - 1)
    }
  }

  const next = () => {
    if (patienceRef.current <= 0) return
    if (i + 1 >= questions.length) {
      playFanfare()
      onWin(mistakes)
      setPhase('won')
    } else setI(i + 1)
  }

  const restart = () => {
    setI(0)
    setMistakes(0)
    setCombo(0)
    setPatience(character?.patience ?? Infinity)
    setAttempt((a) => a + 1)
    setPhase('play')
  }

  return (
    <div className="run" style={{ ['--line' as string]: district.color }}>
      <header className="run-head">
        <button className="icon-btn" onClick={onExit} aria-label="Zurück">
          ✕
        </button>
        <div className="run-title">
          <span className="line-badge">{district.line}</span> {title}
        </div>
        {character && <Patience character={character} left={patience} />}
      </header>
      {phase === 'play' && (
        <div className="run-sub">
          <Dots total={questions.length} current={i} />
          {combo >= 3 && <span className="combo" key={combo}>🔥 ×{combo}</span>}
        </div>
      )}
      <main className="run-body">
        {phase === 'intro' && <Intro character={character} intro={intro} onStart={() => setPhase('play')} />}
        {phase === 'play' && q && (
          <div className="enc" key={`${attempt}-${q.key}`}>
            <TypedQuestion
              word={q.word}
              answers={q.answers}
              options={q.options}
              seconds={seconds}
              onJudged={judged}
              onNext={next}
              prompt={(fill, state) =>
                q.render ? (
                  q.render(fill, state)
                ) : (
                  <>
                    {q.npc && (
                      <div className="bubble npc">
                        <span className="who">{character?.emoji}</span>
                        <Gap text={q.npc} fill={fill} state={state} />
                      </div>
                    )}
                    {q.you && (
                      <div className="bubble you">
                        <Gap text={q.you} fill={q.npc?.includes('___') ? undefined : fill} state={state} />
                      </div>
                    )}
                    {q.hint && <p className="hint">{q.hint}</p>}
                  </>
                )
              }
            />
          </div>
        )}
        {phase === 'lost' && character && <Lost character={character} onRetry={restart} onExit={onExit} />}
        {phase === 'won' && <Won title={winTitle} text={winText(mistakes)} onExit={onExit} />}
      </main>
    </div>
  )
}

function Intro({ character, intro, onStart }: { character?: Character; intro: ReactNode; onStart: () => void }) {
  useEnter(onStart)
  return (
    <div className="endcard appear">
      {character && <div className="endcard-emoji">{character.emoji}</div>}
      {character && (
        <div>
          <strong>{character.name}</strong> <span className="muted">· {character.role}</span>
        </div>
      )}
      <div className="intro-text">{intro}</div>
      <button className="btn big" onClick={onStart}>
        Bereit ↵
      </button>
    </div>
  )
}

function Lost({ character, onRetry, onExit }: { character: Character; onRetry: () => void; onExit: () => void }) {
  useEnter(onRetry)
  return (
    <div className="endcard lost appear">
      <div className="endcard-emoji">{character.emoji}</div>
      <blockquote>„{character.kickout}“</blockquote>
      <button className="btn big" onClick={onRetry}>
        🎫 Neue Nummer ziehen ↵
      </button>
      <button className="btn ghost" onClick={onExit}>
        Zurück zur Linie
      </button>
    </div>
  )
}

function Won({ title, text, onExit }: { title: string; text: ReactNode; onExit: () => void }) {
  useEnter(onExit)
  return (
    <div className="endcard won appear">
      <div className="endcard-emoji">🏆</div>
      <h2>{title}</h2>
      <div className="intro-text">{text}</div>
      <button className="btn big" onClick={onExit}>
        Zurück zur Linie ↵
      </button>
    </div>
  )
}

const stars = (n: number) => '★'.repeat(n) + '☆'.repeat(3 - n)

export function Boss({ district, onExit }: { district: District; onExit: () => void }) {
  const words = useMemo(() => wordMap(district), [district])
  const questions = useMemo<Question[]>(() => {
    const base: Question[] = district.boss.items.map((it, k) => ({
      key: `b${k}`,
      npc: it.npc,
      you: it.you,
      hint: it.hint,
      answers: it.answers,
      options: { casual: it.casual },
      word: it.wordId ? words[it.wordId] : undefined,
    }))
    // Words you got wrong along the way come back for the finale.
    const covered = new Set(district.boss.items.map((it) => it.wordId))
    const missed = (getState().missed[district.id] ?? []).filter((id) => !covered.has(id) && words[id])
    const extra: Question[] = shuffle(missed)
      .slice(0, 5)
      .map((id) => {
        const w = words[id]
        const needArticle = w.article && !w.pluralOnly
        return {
          key: `m-${id}`,
          npc: `Eine Frage noch: Wie heißt „${w.en}“ auf Deutsch?${needArticle ? ' Mit Artikel, bitte.' : ''}`,
          answers: [w.de],
          options: needArticle ? { article: w.article } : {},
          word: w,
          render: undefined,
        }
      })
    return [...base, ...extra]
  }, [district, words])

  return (
    <Gauntlet
      district={district}
      title={district.boss.name}
      character={district.boss.character}
      intro={
        <>
          <p>{district.boss.intro}</p>
          {questions.length > district.boss.items.length && (
            <p className="muted">Achtung: {questions.length - district.boss.items.length} Wörter, die du unterwegs falsch hattest, kommen auch dran.</p>
          )}
        </>
      }
      questions={questions}
      seconds={district.boss.seconds}
      winTitle="Angemeldet!"
      winText={(m) => (
        <>
          <p>Frau Huber stempelt Ihre Meldebescheinigung. Willkommen in München!</p>
          <p className="stars-big">{stars(m === 0 ? 2 : 1)}</p>
          <p className="muted">{m === 0 ? 'Fehlerfrei – zwei Sterne!' : 'Für den zweiten Stern: fehlerfrei durchkommen.'} Der dritte Stern wartet in der Amtsdeutsch-Prüfung.</p>
        </>
      )}
      onWin={(m) => awardStars(district.id, m === 0 ? 2 : 1)}
      onExit={onExit}
    />
  )
}

export function Challenge({ district, onExit }: { district: District; onExit: () => void }) {
  const questions = useMemo<Question[]>(
    () =>
      shuffle(district.challenge.items)
        .slice(0, 8)
        .map((it, k) => ({
          key: `c${k}`,
          answers: it.answers,
          options: {
            nearMiss: {
              answers: [it.casual.replace(/\s*\(.*\)$/, '').replace(/ in$/, '')],
              note: 'Das ist die Alltagsversion – gesucht ist Amtsdeutsch.',
            },
          },
          render: (fill, state) => (
            <>
              <div className="register">
                <span className="casual">{it.casual}</span>
                <span className="arrow">→</span>
                <span className="formal">?</span>
              </div>
              <p className="sentence">
                <Gap text={it.sentence} fill={fill} state={state} />
              </p>
              <p className="hint">{it.en}</p>
            </>
          ),
        })),
    [district],
  )

  return (
    <Gauntlet
      district={district}
      title={district.challenge.name}
      character={district.challenge.character}
      intro={<p>{district.challenge.intro}</p>}
      questions={questions}
      winTitle="Amtsdeutsch bestanden!"
      winText={() => (
        <>
          <p>Sie klingen jetzt offiziell wie ein Formular. Glückwunsch.</p>
          <p className="stars-big">{stars(3)}</p>
        </>
      )}
      onWin={() => awardStars(district.id, 3)}
      onExit={onExit}
    />
  )
}

export function Review({ district, ids, onExit }: { district: District; ids: string[]; onExit: () => void }) {
  const words = useMemo(() => wordMap(district), [district])
  const questions = useMemo<Question[]>(
    () =>
      ids.slice(0, 10).map((id, k) => {
        const w = words[id]
        const needArticle = !!w.article && !w.pluralOnly
        // Alternate between recall from English and filling the sentence gap.
        if (k % 2 === 0) {
          return {
            key: `r-${id}`,
            answers: [w.de],
            options: needArticle ? { article: w.article } : {},
            word: w,
            render: () => (
              <>
                <p className="sentence big">„{w.en}“</p>
                <p className="hint">Auf Deutsch{needArticle ? ' – mit Artikel' : ''}</p>
              </>
            ),
          }
        }
        const c = clozeOf(w)
        return {
          key: `r-${id}`,
          answers: [c.answer],
          word: w,
          render: (fill, state) => (
            <>
              <p className="sentence">
                <Gap text={c.text} fill={fill} state={state} />
              </p>
              <p className="hint">{w.en}</p>
            </>
          ),
        }
      }),
    [ids, words],
  )

  return (
    <Gauntlet
      district={district}
      title="Nebel lichten"
      intro={
        <>
          <p>🌫️ Nebel liegt über dem {district.name}. {questions.length} Wörter sind fällig – frisch sie auf, bevor du sie vergisst.</p>
          <p className="muted">Kein Geduldsmeter hier. Nur du und deine Wörter.</p>
        </>
      }
      questions={questions}
      winTitle="Nebel gelichtet!"
      winText={(m) => <p>{m === 0 ? 'Alles noch da. Stark!' : `${m} Wörter kommen bald wieder – so bleiben sie hängen.`}</p>}
      onWin={() => {}}
      onExit={onExit}
    />
  )
}
