
import { useRef } from 'react'
import type { ChangeEvent, CSSProperties } from 'react'
import type { WritingIssue } from './grammarChecker'
import type { WritingStyleSuggestion } from '../style/styleChecker'

type EditorHighlight = WritingIssue | WritingStyleSuggestion

type HighlightedEditorProps = {
  value: string
  issues: EditorHighlight[]
  onChange: (value: string) => void
  placeholder?: string
}

export default function HighlightedEditor({
  value,
  issues,
  onChange,
  placeholder,
}: HighlightedEditorProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const highlightsRef = useRef<HTMLDivElement>(null)

  const syncScroll = () => {
    const textarea = textareaRef.current
    const highlights = highlightsRef.current

    if (!textarea || !highlights) return

    highlights.scrollTop = textarea.scrollTop
    highlights.scrollLeft = textarea.scrollLeft
  }

  const segments: {
    text: string
    issue?: EditorHighlight
  }[] = []

  const sortedIssues = [...issues]
    .filter(
      (issue) =>
        issue.start >= 0 &&
        issue.end <= value.length &&
        value.slice(issue.start, issue.end) === issue.original,
    )
    .sort((a, b) => a.start - b.start)

  let cursor = 0

  for (const issue of sortedIssues) {
    if (issue.start < cursor) continue

    if (issue.start > cursor) {
      segments.push({ text: value.slice(cursor, issue.start) })
    }

    segments.push({
      text: value.slice(issue.start, issue.end),
      issue,
    })

    cursor = issue.end
  }

  if (cursor < value.length) {
    segments.push({ text: value.slice(cursor) })
  }

  if (value.length === 0) {
    segments.push({ text: placeholder ?? '' })
  }

  const handleChange = (event: ChangeEvent<HTMLTextAreaElement>) => {
    onChange(event.target.value)
    requestAnimationFrame(syncScroll)
  }

  return (
    <div className="highlighted-editor">
      <div
        ref={highlightsRef}
        className="highlight-layer"
        aria-hidden="true"
      >
        {segments.map((segment, index) =>
          segment.issue ? (
            <mark
              key={`${segment.issue.id}-${index}`}
              className={`writing-highlight ${segment.issue.type}`}
            >
              {segment.text}
            </mark>
          ) : (
            <span
              key={`text-${index}`}
              className={
                value.length === 0 && placeholder
                  ? 'highlight-placeholder'
                  : undefined
              }
            >
              {segment.text}
            </span>
          ),
        )}
      </div>

      <textarea
        ref={textareaRef}
        className="writing-editor highlighted-textarea"
        value={value}
        onChange={handleChange}
        onScroll={syncScroll}
        onSelect={syncScroll}
        placeholder={placeholder}
        spellCheck
        aria-label="Writing editor"
        style={{ '--editor-text-color': 'transparent' } as CSSProperties}
      />
    </div>
  )
}
