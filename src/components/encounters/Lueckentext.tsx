import { useState } from 'react'
import type { Result, Word } from '../../types'
import { Gap, TypedQuestion, shuffle } from '../ui'

export function clozeOf(w: Word): { text: string; answer: string } {
  const answer = w.cloze ?? w.de
  const idx = w.example.indexOf(answer)
  if (idx < 0) return { text: `${w.example} → ___`, answer }
  return { text: w.example.slice(0, idx) + '___' + w.example.slice(idx + answer.length), answer }
}

/** Fill the gap in a real sentence by typing the word in the right form. */
export function Lueckentext({ words, onResult, onDone }: { words: Word[]; onResult: (r: Result) => void; onDone: () => void }) {
  const [queue] = useState(() => shuffle(words))
  const [i, setI] = useState(0)
  const word = queue[i]
  const { text, answer } = clozeOf(word)

  return (
    <div className="enc">
      <h3 className="enc-title">Lückentext</h3>
      <TypedQuestion
        key={word.id + i}
        word={word}
        answers={[answer]}
        prompt={(fill, state) => (
          <>
            <p className="sentence">
              <Gap text={text} fill={fill} state={state} />
            </p>
            <p className="hint">{word.en}</p>
          </>
        )}
        onJudged={(ok) => onResult({ wordId: word.id, correct: ok })}
        onNext={() => (i + 1 >= queue.length ? onDone() : setI(i + 1))}
      />
    </div>
  )
}
