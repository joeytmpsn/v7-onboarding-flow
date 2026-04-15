import { useCallback, useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import './App.css'

const promptFlow = [
  {
    id: 'starter',
    label: '',
    prompt: 'What agent should we build?',
    options: [
      'Extract information from quarterly fund reports',
      'Compare manager commentary across reports',
      'Track changes in allocation, exposures, and performance',
    ],
    freeTextPlaceholder: 'Something else, share your thoughts',
  },
  {
    id: 'q1',
    label: '1 of 2',
    prompt: 'What are you usually pulling from these reports first?',
    options: [
      'Performance and cash flow figures',
      'Holdings and allocation changes',
      'Manager commentary and risks',
    ],
    freeTextPlaceholder: 'Other—say what you reach for first',
  },
  {
    id: 'q2',
    label: '2 of 2',
    prompt: 'What would make this immediately useful this quarter?',
    options: [
      'A concise performance summary',
      'A clean view of holdings and exposures',
      'A sharper risks and commentary readout',
    ],
    freeTextPlaceholder: 'Something else—what would help you this quarter',
  },
]

const completionExploreChoice = 'Explore this agent'

/** Shown in the structured composer only—the sign-off lives in `completionCeremonyBlocks`. */
const completionQuestion = {
  id: 'completion',
  label: '',
  prompt: 'What would you like to do next?',
  options: [completionExploreChoice, 'Create another one'],
  includeFreeText: false,
}

/** Invite shown in the main thread when insight cards appear—bold segment calls out the chips. */
const citationInviteMessageId = 'evidence-citation-invite'

const citationInviteBlocks = [
  {
    inline: [
      'Review the takeaways above, then ',
      { bold: true, text: 'click a citation number' },
      ' to open the matching passage in the PDF beside this chat.',
    ],
  },
]

/** Wrap ceremony streams below the insight cards after the user opens a citation (not before). */
const completionCeremonyBlocks = [
  "🎉 That's a wrap—you've got an agent wired for how you work at quarter-end.",
  'Everything we set up—template, fields, citations—is in place. You earned a clean handoff; from here, it is yours to explore with confidence.',
  "I'm on your side if you want to tune anything later. When you're ready, pick your next step below.",
]

const defaultFreeTextPlaceholder = 'Something else, share your thoughts'

const baseReports = [
  {
    fileName: '2023-09-30-CLO-Quarterly-Report-Final.pdf',
    fundName: 'Commissioners of the Land',
    reportingPeriod: 'Quarter ending September 30, 2023',
    reportingQuarter: 'Q3',
    fundType: 'Balanced Fund',
    aumCurrency: 'USD',
    performanceMetrics: '11 collection items',
    topHoldings: '10 collection items',
    sectorAllocation: '12 collection items',
    geographicAllocation: '8 collection items',
    distributionInfo: '9 collection items',
    fundStrategyChanges:
      'Tilted further toward quality cyclical names while trimming rate-sensitive exposure.',
    marketCommentary:
      'Performance stabilized late in the quarter, though international growth remained volatile.',
    keyRisks:
      'Sticky inflation, elevated rates, and slower consumer demand remain the primary watch items.',
    performanceAttribution:
      'Energy and industrial cyclicals offset weakness in consumer-facing positions.',
    benchmarkComparison:
      'Slight underperformance versus benchmark, with stronger relative positioning in energy.',
    performanceSummary:
      'Returns were mixed this quarter, with a late rebound driven by sector rotation and selective cyclicals.',
  },
  {
    fileName: 'Q 24-03.pdf',
    fundName: 'Pooled Investment Fund',
    reportingPeriod: 'Quarter ending March 31, 2023',
    reportingQuarter: 'Q1',
    fundType: 'Fixed Income Fund',
    aumCurrency: 'USD',
    performanceMetrics: '8 collection items',
    topHoldings: '7 collection items',
    sectorAllocation: '9 collection items',
    geographicAllocation: '5 collection items',
    distributionInfo: '6 collection items',
    fundStrategyChanges:
      'Shortened duration exposure and added defensive credit positions during the quarter.',
    marketCommentary:
      'Managers focused on resilience and liquidity as rate expectations shifted higher.',
    keyRisks:
      'Duration sensitivity and refinancing pressure remain the leading concerns.',
    performanceAttribution:
      'Carry income was supportive, though duration positioning detracted modestly.',
    benchmarkComparison:
      'Performance held broadly in line with the benchmark.',
    performanceSummary:
      'Defensive repositioning preserved capital as rates repriced and credit spreads widened modestly.',
  },
  {
    fileName: 'Q122 Quarterly Investment Review.pdf',
    fundName: 'CSS Pension Plan',
    reportingPeriod: 'Quarter ending March 31, 2023',
    reportingQuarter: 'Q1',
    fundType: 'Other Fund',
    aumCurrency: 'CAD',
    performanceMetrics: '14 collection items',
    topHoldings: '10 collection items',
    sectorAllocation: '11 collection items',
    geographicAllocation: '6 collection items',
    distributionInfo: '7 collection items',
    fundStrategyChanges:
      'Rebalanced toward global quality and reduced exposure to levered small-cap strategies.',
    marketCommentary:
      'Managers highlighted persistent policy uncertainty and uneven earnings revisions.',
    keyRisks:
      'Policy error risk and uneven consumer demand continue to pressure confidence.',
    performanceAttribution:
      'Quality growth names recovered while small-cap allocations lagged.',
    benchmarkComparison:
      'Fund performance improved relative to the benchmark over the second half of the quarter.',
    performanceSummary:
      'Recovery in quality growth improved relative performance, though risk appetite remained selective.',
  },
]

const tableColumns = [
  { key: 'fileName', label: 'File', stage: 'file' },
  { key: 'fundName', label: 'Fund Name', stage: 'core' },
  { key: 'reportingPeriod', label: 'Reporting Period', stage: 'core' },
  { key: 'reportingQuarter', label: 'Reporting Quarter', stage: 'core' },
  { key: 'fundType', label: 'Fund Type', stage: 'core' },
  { key: 'aumCurrency', label: 'AUM Currency', stage: 'core' },
  { key: 'performanceMetrics', label: 'Performance Metrics', stage: 'analysis' },
  { key: 'topHoldings', label: 'Top Holdings', stage: 'analysis' },
  { key: 'sectorAllocation', label: 'Sector Allocation', stage: 'complete' },
]

const stageOrder = {
  'file-only': 0,
  core: 1,
  analysis: 2,
  complete: 3,
}

function SvgIcon({ children, size = 16, title }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden={title ? undefined : true}
      role={title ? 'img' : undefined}
    >
      {title ? <title>{title}</title> : null}
      {children}
    </svg>
  )
}

function quarterPillClass(quarter) {
  if (quarter === 'Q3') return 'v7-pill v7-pill-q3'
  if (quarter === 'Q1') return 'v7-pill v7-pill-q1'
  return 'v7-pill v7-pill-qx'
}

function fundPillClass(fundType) {
  const map = {
    'Balanced Fund': 'v7-pill v7-pill-fund-balanced',
    'Fixed Income Fund': 'v7-pill v7-pill-fund-fixed',
    'Other Fund': 'v7-pill v7-pill-fund-other',
  }
  return map[fundType] || 'v7-pill v7-pill-fund-default'
}

function renderV7Cell(column, cell) {
  const v = cell.value
  const empty = !v || cell.className === 'is-empty'

  if (column.key === 'fileName' && v) {
    return (
      <span className="v7-cell-file">
        <span className="v7-file-icon" aria-hidden>
          <SvgIcon size={14}>
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
            <polyline points="14 2 14 8 20 8" />
          </SvgIcon>
        </span>
        <span className="v7-truncate">{v}</span>
      </span>
    )
  }

  if (column.key === 'fundName') {
    return empty ? (
      <span className="v7-cell-empty" />
    ) : (
      <span className="v7-truncate" title={v}>
        {v}
      </span>
    )
  }

  if (column.key === 'reportingQuarter') {
    return empty ? (
      <span className="v7-cell-empty" />
    ) : (
      <span className={quarterPillClass(v)}>{v}</span>
    )
  }

  if (column.key === 'fundType') {
    return empty ? (
      <span className="v7-cell-empty" />
    ) : (
      <span className={fundPillClass(v)}>{v}</span>
    )
  }

  return empty ? (
    <span className="v7-cell-empty" />
  ) : (
    <span
      className={`v7-cell-plain ${cell.className === 'is-ai-generated' ? 'is-filled' : ''}`}
      title={typeof v === 'string' ? v : undefined}
    >
      {v}
    </span>
  )
}

function headerIconForColumn(key) {
  if (key === 'fileName') {
    return (
      <SvgIcon size={14} title="File column">
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
        <polyline points="14 2 14 8 20 8" />
      </SvgIcon>
    )
  }
  if (key === 'reportingQuarter' || key === 'fundType') {
    return (
      <SvgIcon size={14}>
        <circle cx="12" cy="12" r="8" />
        <path d="M8 12l2.5 2.5L16 9" />
      </SvgIcon>
    )
  }
  return (
    <SvgIcon size={14}>
      <line x1="4" y1="6" x2="20" y2="6" />
      <line x1="4" y1="12" x2="20" y2="12" />
      <line x1="4" y1="18" x2="14" y2="18" />
    </SvgIcon>
  )
}

/** Must respect Vite `base` (e.g. `/v7-onboarding-flow/` on GitHub Pages). */
const evidenceImages = {
  cover: `${import.meta.env.BASE_URL}evidence/report-cover.png`,
  '1': `${import.meta.env.BASE_URL}evidence/citation-1.png`,
  '2': `${import.meta.env.BASE_URL}evidence/citation-2.png`,
  '4': `${import.meta.env.BASE_URL}evidence/citation-4.png`,
  '6': `${import.meta.env.BASE_URL}evidence/citation-6.png`,
  '8': `${import.meta.env.BASE_URL}evidence/citation-8.png`,
}

const teaserInsights = [
  {
    id: 'insight-1',
    title:
      'Performance improved late in the quarter, but benchmark-relative returns still finished soft.',
    chips: [
      { id: '1', label: '1' },
      { id: '2', label: '2' },
    ],
  },
  {
    id: 'insight-2',
    title:
      'The manager rotated toward broader MBS exposure and higher-quality cyclicals during the quarter.',
    chips: [
      { id: '4', label: '4' },
      { id: '6', label: '6' },
    ],
  },
  {
    id: 'insight-3',
    title:
      'The risk read-through is still dominated by sticky inflation, elevated rates, and a softer consumer backdrop.',
    chips: [
      { id: '8', label: '8' },
    ],
  },
]

const portalNavItems = [
  { id: 'home', label: 'Home', icon: 'home' },
  { id: 'search', label: 'Search', icon: 'search', shortcut: '⌘K' },
  { id: 'knowledge', label: 'Knowledge', icon: 'knowledge' },
  { id: 'skills', label: 'Skills', icon: 'skills' },
  { id: 'integrations', label: 'Integrations', icon: 'integrations' },
  { id: 'support', label: 'Support', icon: 'support' },
]

const portalAgents = [
  { id: 'a1', name: 'Quarterly Fund Reports', dot: 'green' },
  { id: 'a2', name: 'Quarterly Fund Reports 2', dot: 'orange' },
]

function PortalSidebarIcon({ name, size = 18 }) {
  const common = { width: size, height: size, viewBox: '0 0 24 24' }
  switch (name) {
    case 'home':
      return (
        <svg {...common} fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden>
          <path d="M3 9.5L12 3l9 6.5V21a1 1 0 0 1-1 1h-5v-7H9v7H4a1 1 0 0 1-1-1V9.5z" />
        </svg>
      )
    case 'search':
      return (
        <svg {...common} fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden>
          <circle cx="11" cy="11" r="7" />
          <path d="M21 21l-4.35-4.35" />
        </svg>
      )
    case 'knowledge':
      return (
        <svg {...common} fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden>
          <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
          <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
          <path d="M9 6h6M9 10h6" />
        </svg>
      )
    case 'skills':
      return (
        <svg {...common} fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden>
          <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />
        </svg>
      )
    case 'integrations':
      return (
        <svg {...common} fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden>
          <rect x="3" y="3" width="7" height="7" rx="1" />
          <rect x="14" y="3" width="7" height="7" rx="1" />
          <rect x="3" y="14" width="7" height="7" rx="1" />
          <rect x="14" y="14" width="7" height="7" rx="1" />
        </svg>
      )
    case 'support':
      return (
        <svg {...common} fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden>
          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V7a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
        </svg>
      )
    default:
      return null
  }
}

function getBlockFullText(block) {
  if (typeof block === 'string') {
    return block
  }
  if (block?.inline) {
    return block.inline.reduce((acc, part) => {
      const t = typeof part === 'string' ? part : part.text
      return acc + t
    }, '')
  }
  return ''
}

function renderInlineParts(parts, charCount) {
  let remaining = charCount
  const nodes = []
  let key = 0
  for (const part of parts) {
    if (remaining <= 0) {
      break
    }
    const isBold = typeof part === 'object' && part !== null && part.bold
    const text = typeof part === 'string' ? part : part.text
    const take = Math.min(text.length, remaining)
    const chunk = text.slice(0, take)
    if (chunk) {
      nodes.push(
        isBold ? (
          <strong key={key}>{chunk}</strong>
        ) : (
          <span key={key}>{chunk}</span>
        ),
      )
      key += 1
    }
    remaining -= take
  }
  return nodes
}

function renderBlockContent(block, typedPrefix) {
  if (!typedPrefix) {
    return null
  }
  if (typeof block === 'string') {
    return block.trim().endsWith('?') ? <strong>{typedPrefix}</strong> : typedPrefix
  }
  if (block?.inline) {
    return renderInlineParts(block.inline, typedPrefix.length)
  }
  return typedPrefix
}

function AssistantMessage({ blocks, onDone }) {
  const [phase, setPhase] = useState('thinking')
  const [typedBlocks, setTypedBlocks] = useState(() => blocks.map(() => ''))
  const onDoneRef = useRef(onDone)

  useEffect(() => {
    onDoneRef.current = onDone
  }, [onDone])

  useEffect(() => {
    let cancelled = false
    let timeoutId

    const runStreaming = async () => {
      timeoutId = window.setTimeout(async () => {
        if (cancelled) {
          return
        }

        setPhase('streaming')

        for (let blockIndex = 0; blockIndex < blocks.length; blockIndex += 1) {
          const block = blocks[blockIndex]
          const fullText = getBlockFullText(block)
          const tickMs = Math.max(10, 280 / Math.max(fullText.length, 1))

          for (let charIndex = 1; charIndex <= fullText.length; charIndex += 1) {
            if (cancelled) {
              return
            }

            setTypedBlocks((prev) =>
              prev.map((value, index) =>
                index === blockIndex ? fullText.slice(0, charIndex) : value,
              ),
            )

            await new Promise((resolve) => {
              timeoutId = window.setTimeout(resolve, tickMs)
            })
          }

          await new Promise((resolve) => {
            timeoutId = window.setTimeout(resolve, 120)
          })
        }

        if (!cancelled) {
          setPhase('done')
          onDoneRef.current?.()
        }
      }, 520)
    }

    runStreaming()

    return () => {
      cancelled = true
      window.clearTimeout(timeoutId)
    }
  }, [blocks])

  return (
    <div className="assistant-card is-streaming">
      {phase === 'thinking' ? (
        <div className="thinking-row" aria-label="Assistant is thinking">
          <span className="thinking-dot" />
          <span className="thinking-dot" />
          <span className="thinking-dot" />
        </div>
      ) : null}

      {typedBlocks.map((typed, index) => {
        const block = blocks[index]
        const full = getBlockFullText(block)
        return typed ? (
          <p key={`assistant-block-${index}`}>
            {renderBlockContent(block, typed)}
            {phase === 'streaming' &&
            typed === full &&
            index === typedBlocks.filter(Boolean).length - 1 ? (
              <span className="stream-cursor" />
            ) : null}
          </p>
        ) : null
      })}
    </div>
  )
}

function App() {
  const MotionAside = motion.aside
  const MotionHeader = motion.header
  const MotionDiv = motion.div
  const MotionSection = motion.section
  const [messages, setMessages] = useState([
    {
      id: 'welcome',
      type: 'assistant',
      blocks: [
        'Welcome to V7 Go, Shiv.',
        'I can help you build document workflows, research flows, and review-ready agents that turn messy information into something structured and useful.',
        "It's quarter-end, so I can help you get through reporting faster—pulling the key fields from quarterly fund reports, keeping the evidence attached, and getting you to a confident first pass sooner than doing it by hand.",
        'Visible only to you right now. Your documents stay private unless you choose to share the agent later.',
        'What agent should we build?',
      ],
    },
  ])
  const [step, setStep] = useState('starter')
  const [answers, setAnswers] = useState({})
  const [planExpanded, setPlanExpanded] = useState(false)
  const [canvasOpen, setCanvasOpen] = useState(false)
  const [soloCanvas, setSoloCanvas] = useState(false)
  const [uploadMenuOpen, setUploadMenuOpen] = useState(false)
  const [records, setRecords] = useState([])
  const [processingDone, setProcessingDone] = useState(false)
  const [selectedReportId, setSelectedReportId] = useState(null)
  const [activeCitation, setActiveCitation] = useState('cover')
  const [showInsights, setShowInsights] = useState(false)
  const [completionChoice, setCompletionChoice] = useState(null)
  const [portalMode, setPortalMode] = useState(false)
  const [activeQuestionIndex, setActiveQuestionIndex] = useState(0)
  const [freeTextDraft, setFreeTextDraft] = useState('')
  const [activeStreamId, setActiveStreamId] = useState('welcome')
  const [pendingStep, setPendingStep] = useState('starter')
  const [completionPromptReady, setCompletionPromptReady] = useState(false)
  const [citationExplored, setCitationExplored] = useState(false)
  const [citationInviteComplete, setCitationInviteComplete] = useState(false)
  const [showWrapCeremonyBelow, setShowWrapCeremonyBelow] = useState(false)
  const fileInputRef = useRef(null)
  const freeTextInputRef = useRef(null)
  const messageEndRef = useRef(null)
  const questionCardRef = useRef(null)
  const messageIdRef = useRef(1)
  const citationInviteSentRef = useRef(false)
  const selectedFocus = answers.q1 || 'Performance and cash flow figures'
  const selectedOutcome = answers.q2 || 'A concise performance summary'
  const currentQuestion =
    activeStreamId === null
      ? step === 'evidence' &&
          showInsights &&
          completionChoice === null &&
          completionPromptReady
        ? completionQuestion
        : promptFlow.find((question) => question.id === step)
      : null
  const freeTextPlaceholder =
    currentQuestion && currentQuestion.includeFreeText !== false
      ? currentQuestion.freeTextPlaceholder ?? defaultFreeTextPlaceholder
      : ''

  const questionOptions = currentQuestion
    ? currentQuestion.includeFreeText === false
      ? [...currentQuestion.options]
      : [...currentQuestion.options, freeTextPlaceholder]
    : []
  const isFreeTextRow = (index) =>
    Boolean(
      currentQuestion &&
        currentQuestion.includeFreeText !== false &&
        index === questionOptions.length - 1,
    )

  useEffect(() => {
    messageEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' })
  }, [messages, step, planExpanded, showInsights, showWrapCeremonyBelow])

  useEffect(() => {
    if (
      step === 'starter' ||
      step === 'q1' ||
      step === 'q2' ||
      (step === 'evidence' &&
        showInsights &&
        completionChoice === null &&
        completionPromptReady)
    ) {
      questionCardRef.current?.focus()
    }
  }, [step, showInsights, completionChoice, completionPromptReady])

  useEffect(() => {
    if (!currentQuestion || currentQuestion.includeFreeText === false) {
      return
    }

    if (activeQuestionIndex === questionOptions.length - 1) {
      freeTextInputRef.current?.focus()
    }
  }, [activeQuestionIndex, currentQuestion, questionOptions.length])

  useEffect(() => {
    if (
      step === 'evidence' &&
      showInsights &&
      completionChoice === null &&
      completionPromptReady
    ) {
      setActiveQuestionIndex(0)
      setFreeTextDraft('')
    }
  }, [step, showInsights, completionChoice, completionPromptReady])

  useEffect(() => {
    if (step !== 'canvas-building') {
      return
    }

    const timers = [
      ...baseReports.flatMap((_, index) => [
        setTimeout(() => {
          setRecords((prev) =>
            prev.map((item) =>
              item.id === `sample-${index}` ? { ...item, status: 'core' } : item,
            ),
          )
        }, 900 + index * 260),
        setTimeout(() => {
          setRecords((prev) =>
            prev.map((item) =>
              item.id === `sample-${index}` ? { ...item, status: 'analysis' } : item,
            ),
          )
        }, 2100 + index * 320),
        setTimeout(() => {
          setRecords((prev) =>
            prev.map((item) =>
              item.id === `sample-${index}` ? { ...item, status: 'complete' } : item,
            ),
          )
        }, 3600 + index * 380),
      ]),
      setTimeout(() => {
        setMessages((prev) => [
          ...prev,
          {
            id: 'build-msg',
            type: 'assistant',
            blocks: [
              "I've built this on top of our existing Quarterly Fund Reports template and tuned it to how you work at quarter-end.",
              'It brings each report into one consistent view, pulls out the figures you review first, and creates a concise first pass you can actually work from.',
              "When you upload a few PDFs, I'll start extracting the key fields right away, surface useful insights, and show you how V7 ties every citation back to observable evidence in the connected files.",
              {
                inline: [
                  'Whenever you are ready, ',
                  { bold: true, text: 'drop in a few quarterly reports' },
                  ' and I will get to work.',
                ],
              },
            ],
          },
        ])
        setActiveStreamId('build-msg')
        setPendingStep('upload-ready')
      }, 5200),
    ]

    return () => timers.forEach(clearTimeout)
  }, [step])

  useEffect(() => {
    if (!processingDone) {
      return
    }
    const timer = setTimeout(() => {
      setMessages((prev) => [
        ...prev,
        {
          id: 'choose-hero',
          type: 'assistant',
          blocks: [
            'The first pass is ready. Pick a report from the canvas and I will pull out a few evidence-backed takeaways worth reviewing first.',
          ],
        },
      ])
      setActiveStreamId('choose-hero')
      setPendingStep('select-report')
    }, 900)

    return () => clearTimeout(timer)
  }, [processingDone])

  useEffect(() => {
    if (step !== 'evidence') {
      return
    }
    const timer = setTimeout(() => setShowInsights(true), 350)
    return () => clearTimeout(timer)
  }, [step])

  useEffect(() => {
    if (completionChoice !== completionExploreChoice) {
      return
    }
    const timer = setTimeout(() => {
      setPortalMode(true)
      setStep('portal')
    }, 1200)
    return () => clearTimeout(timer)
  }, [completionChoice])

  const addUserMessage = (text) => {
    setMessages((prev) => [...prev, { id: `${text}-${prev.length}`, type: 'user', text }])
  }

  const addAssistantMessage = (blocks, nextStep = null) => {
    const messageId = `assistant-${messageIdRef.current}`
    messageIdRef.current += 1
    setMessages((prev) => [
      ...prev,
      {
        id: messageId,
        type: 'assistant',
        blocks,
      },
    ])
    setActiveStreamId(messageId)
    setPendingStep(nextStep)
  }

  const addAssistantMessageById = useCallback((id, blocks, nextStep = null) => {
    setMessages((prev) => [...prev, { id, type: 'assistant', blocks }])
    setActiveStreamId(id)
    setPendingStep(nextStep)
  }, [])

  useEffect(() => {
    if (step !== 'evidence') {
      setCompletionPromptReady(false)
      setCitationExplored(false)
      setCitationInviteComplete(false)
      setShowWrapCeremonyBelow(false)
      citationInviteSentRef.current = false
    }
  }, [step])

  useEffect(() => {
    if (!showInsights) {
      setCompletionPromptReady(false)
      setCitationExplored(false)
      setCitationInviteComplete(false)
      setShowWrapCeremonyBelow(false)
      citationInviteSentRef.current = false
    }
  }, [showInsights])

  useEffect(() => {
    if (step !== 'evidence' || !showInsights || completionChoice !== null) {
      return
    }
    if (citationInviteSentRef.current) {
      return
    }
    const timer = window.setTimeout(() => {
      citationInviteSentRef.current = true
      addAssistantMessageById(citationInviteMessageId, citationInviteBlocks, null)
    }, 420)
    return () => window.clearTimeout(timer)
  }, [step, showInsights, completionChoice, addAssistantMessageById])

  useEffect(() => {
    if (step !== 'evidence' || !showInsights || completionChoice !== null) {
      return
    }
    if (!citationExplored || !citationInviteComplete) {
      return
    }
    if (showWrapCeremonyBelow) {
      return
    }
    setShowWrapCeremonyBelow(true)
  }, [
    step,
    showInsights,
    completionChoice,
    citationExplored,
    citationInviteComplete,
    showWrapCeremonyBelow,
  ])

  const handleStarterChoice = useCallback((choice) => {
    addUserMessage(choice)
    addAssistantMessage(
      [
        'Good choice. We already have a Quarterly Fund Reports template, so I will build on that instead of making you configure this from scratch.',
        'A couple of quick questions so I can tune it to what matters most in your workflow.',
      ],
      'q1',
    )
    setFreeTextDraft('')
    setActiveQuestionIndex(0)
  }, [])

  const handleQuestionChoice = useCallback((questionId, choice) => {
    addUserMessage(choice)
    setAnswers((prev) => ({ ...prev, [questionId]: choice }))
    setFreeTextDraft('')

    if (questionId === 'q1') {
      addAssistantMessage(
        [
          'That helps. I will keep the workflow anchored on performance and cash flow first, then shape the rest around what will be most useful this quarter.',
        ],
        'q2',
      )
      setActiveQuestionIndex(0)
      return
    }

    addAssistantMessage(
      [
        "I've put together a plan for your agent based on your answers. We'll start from the existing Quarterly Fund Reports template, emphasize performance and cash flow fields, and add a concise performance summary with citations so it is immediately useful this quarter.",
      ],
      'plan',
    )
  }, [])

  const handleAssistantDone = useCallback(
    (messageId) => {
      if (messageId !== activeStreamId) {
        return
      }

      setActiveStreamId(null)

      if (messageId === citationInviteMessageId) {
        setCitationInviteComplete(true)
      }

      if (pendingStep) {
        setStep(pendingStep)
        setPendingStep(null)
      }
    },
    [activeStreamId, pendingStep],
  )

  const handleCompletion = (choice) => {
    setCompletionChoice(choice)
    addUserMessage(choice)
    if (choice === completionExploreChoice) {
      setSoloCanvas(true)
      addAssistantMessage(
        [
          "You're good to go. I've left everything in place so you can step straight into the live agent experience.",
        ],
        'handoff',
      )
      return
    }

    addAssistantMessage([
      'Great. You can stay in setup mode and start another agent from the same workspace.',
    ])
  }

  useEffect(() => {
    if (!currentQuestion) {
      return undefined
    }

    const handleWindowKeyDown = (event) => {
      const target = event.target
      const isFreeTextFocused = target instanceof HTMLElement && target.dataset.freeText === 'true'

      if (isFreeTextFocused) {
        if (event.key === 'ArrowUp') {
          event.preventDefault()
          setActiveQuestionIndex(Math.max(questionOptions.length - 2, 0))
        }
        return
      }

      if (event.key === 'ArrowDown') {
        event.preventDefault()
        setActiveQuestionIndex((prev) => (prev + 1) % questionOptions.length)
        return
      }

      if (event.key === 'ArrowUp') {
        event.preventDefault()
        setActiveQuestionIndex((prev) => (prev - 1 + questionOptions.length) % questionOptions.length)
        return
      }

      if (event.key === 'Enter') {
        event.preventDefault()
        if (currentQuestion.id === 'completion') {
          handleCompletion(currentQuestion.options[activeQuestionIndex])
          return
        }
        const choice =
          activeQuestionIndex === currentQuestion.options.length
            ? freeTextDraft.trim() || freeTextPlaceholder
            : currentQuestion.options[activeQuestionIndex]

        if (step === 'starter') {
          handleStarterChoice(choice)
          return
        }

        handleQuestionChoice(step, choice)
      }
    }

    window.addEventListener('keydown', handleWindowKeyDown)

    return () => {
      window.removeEventListener('keydown', handleWindowKeyDown)
    }
  }, [
    activeQuestionIndex,
    currentQuestion,
    freeTextDraft,
    freeTextPlaceholder,
    handleCompletion,
    handleQuestionChoice,
    handleStarterChoice,
    questionOptions.length,
    step,
  ])

  const handleFreeTextKeyDown = (event) => {
    if (!currentQuestion) {
      return
    }

    if (event.key === 'ArrowUp') {
      event.preventDefault()
      setActiveQuestionIndex(Math.max(questionOptions.length - 2, 0))
      return
    }

    if (event.key === 'ArrowDown') {
      event.preventDefault()
      return
    }

    if (event.key === 'Enter') {
      event.preventDefault()
      const choice = freeTextDraft.trim() || freeTextPlaceholder

      if (step === 'starter') {
        handleStarterChoice(choice)
        return
      }

      handleQuestionChoice(step, choice)
    }
  }

  const handleBuild = () => {
    setRecords(
      baseReports.map((report, index) => ({
        ...report,
        id: `sample-${index}`,
        status: 'file-only',
        sample: true,
      })),
    )
    setCanvasOpen(true)
    setStep('canvas-building')
  }

  const handleUploadMenu = () => {
    if (step !== 'upload-ready' && step !== 'processing' && step !== 'select-report') {
      return
    }
    setUploadMenuOpen((prev) => !prev)
  }

  const handleUploadClick = () => {
    setUploadMenuOpen(false)
    fileInputRef.current?.click()
  }

  const handleFilesSelected = (event) => {
    const files = Array.from(event.target.files || [])
    if (!files.length) {
      return
    }

    addUserMessage(files.map((file) => file.name).join(', '))
    addAssistantMessage([
      'Perfect. I am ingesting those reports now and populating the template on the right.',
    ])
    setStep('processing')
    setRecords([])
    setProcessingDone(false)

    files.slice(0, 3).forEach((file, index) => {
      const base = baseReports[index % baseReports.length]
      const record = {
        id: `record-${index}`,
        fileName: file.name,
        status: 'ingesting',
        ...base,
      }

      setTimeout(() => {
        setRecords((prev) => [...prev, record])
      }, 500 + index * 600)

      setTimeout(() => {
        setRecords((prev) =>
          prev.map((item) =>
            item.id === record.id ? { ...item, status: 'core' } : item,
          ),
        )
      }, 1400 + index * 650)

      setTimeout(() => {
        setRecords((prev) =>
          prev.map((item) =>
            item.id === record.id ? { ...item, status: 'analysis' } : item,
          ),
        )
      }, 2400 + index * 650)

      setTimeout(() => {
        setRecords((prev) =>
          prev.map((item) =>
            item.id === record.id ? { ...item, status: 'complete' } : item,
          ),
        )

        if (index === Math.min(files.length, 3) - 1) {
          setProcessingDone(true)
        }
      }, 3500 + index * 650)
    })
  }

  const handleSelectReport = (reportId) => {
    if (!processingDone) {
      return
    }
    setSelectedReportId(reportId)
    setActiveCitation('cover')
    setShowInsights(false)
    setCitationExplored(false)
    setCitationInviteComplete(false)
    setShowWrapCeremonyBelow(false)
    setCompletionPromptReady(false)
    citationInviteSentRef.current = false
    addAssistantMessage(['I pulled out three things worth reviewing first.'], 'evidence')
  }

  const handleCitationClick = (sectionId) => {
    setActiveCitation(sectionId)
    if (step === 'evidence' && sectionId !== 'cover') {
      setCitationExplored(true)
    }
  }

  const selectedReport =
    records.find((record) => record.id === selectedReportId) || records[0]

  const getCellState = (record, column) => {
    if (column.stage === 'file') {
      return { value: record.fileName, className: 'is-file' }
    }

    const statusValue = stageOrder[record.status] ?? 0
    const columnValue = stageOrder[column.stage] ?? 0
    const isReady = statusValue >= columnValue

    return {
      value: isReady ? record[column.key] : '',
      className: isReady ? 'is-ai-generated' : 'is-empty',
    }
  }

  return (
    <div className={`app-shell ${portalMode ? 'is-portal' : ''}`}>
      <AnimatePresence>
        {portalMode && (
          <MotionAside
            className="global-sidebar"
            initial={{ x: -32, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: -32, opacity: 0 }}
            transition={{ duration: 0.45, ease: 'easeOut' }}
          >
            <div className="sidebar-workspace-bar">
              <div className="sidebar-workspace-left">
                <span className="sidebar-brand-badge" aria-hidden>
                  TD
                </span>
                <button type="button" className="sidebar-workspace-trigger">
                  <span className="sidebar-workspace-label">TD Talent Design Worksp…</span>
                  <SvgIcon size={14}>
                    <polyline points="6 9 12 15 18 9" />
                  </SvgIcon>
                </button>
              </div>
              <button type="button" className="sidebar-collapse-btn" aria-label="Collapse sidebar">
                <SvgIcon size={16}>
                  <rect x="5" y="5" width="14" height="14" rx="2" />
                  <line x1="9" y1="5" x2="9" y2="19" />
                </SvgIcon>
              </button>
            </div>

            <nav className="portal-nav" aria-label="Primary">
              {portalNavItems.map((item) => (
                <button key={item.id} type="button" className="nav-link nav-link-v7">
                  <span className="nav-link-icon">
                    <PortalSidebarIcon name={item.icon} size={18} />
                  </span>
                  <span className="nav-link-label">{item.label}</span>
                  {item.shortcut ? (
                    <span className="nav-link-shortcut">{item.shortcut}</span>
                  ) : null}
                </button>
              ))}
            </nav>

            <div className="agent-panel">
              <div className="agent-tabs agent-tabs-v7" role="tablist" aria-label="Agents or chats">
                <button type="button" className="tab is-active" role="tab" aria-selected="true">
                  Agents
                </button>
                <button type="button" className="tab" role="tab" aria-selected="false">
                  Chats
                </button>
              </div>
              <label className="agent-search-wrap">
                <span className="visually-hidden">Search agents</span>
                <input
                  className="agent-search"
                  placeholder="Search agents"
                  readOnly
                  tabIndex={-1}
                />
              </label>
              <button type="button" className="create-agent create-agent-v7">
                + Create a new Agent
              </button>
              <div className="agent-list">
                {portalAgents.map((agent, index) => (
                  <button
                    key={agent.id}
                    type="button"
                    className={`agent-row agent-row-v7 ${index === 0 ? 'is-active' : ''}`}
                  >
                    <span className={`agent-status-dot agent-status-dot--${agent.dot}`} aria-hidden />
                    <span className="agent-row-name">{agent.name}</span>
                  </button>
                ))}
              </div>
            </div>

            <div className="sidebar-fields-footer">
              <div className="sidebar-fields-label">
                <span>Fields</span>
                <span className="sidebar-fields-count">4,403 / 50K</span>
              </div>
              <div className="sidebar-fields-track" aria-hidden>
                <div className="sidebar-fields-fill" />
              </div>
            </div>
          </MotionAside>
        )}
      </AnimatePresence>

      <div className="workspace">
        <AnimatePresence>
          {portalMode && (
            <MotionHeader
              className="canvas-v7-nav portal-app-topnav"
              initial={{ y: -12, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ duration: 0.4, delay: 0.08 }}
            >
              <div className="canvas-v7-nav-left">
                <nav className="canvas-v7-breadcrumb" aria-label="Breadcrumb">
                  <span className="canvas-v7-bc-link">Home</span>
                  <span className="canvas-v7-bc-sep" aria-hidden>
                    &gt;
                  </span>
                  <span className="canvas-v7-bc-link">Quarterly Fund Reports</span>
                  <span className="canvas-v7-draft-badge">
                    <span className="canvas-v7-draft-dot" aria-hidden />
                    Draft
                  </span>
                </nav>
              </div>
              <div className="canvas-v7-nav-center">
                <div className="canvas-v7-tabs" role="tablist" aria-label="Canvas mode">
                  <button type="button" className="canvas-v7-tab is-active" role="tab" aria-selected="true">
                    Build
                  </button>
                  <button type="button" className="canvas-v7-tab" role="tab" aria-selected="false">
                    Review
                  </button>
                  <button type="button" className="canvas-v7-tab" role="tab" aria-selected="false">
                    Visualize
                  </button>
                </div>
              </div>
              <div className="canvas-v7-nav-right portal-top-actions">
                <button type="button" className="v7-btn-export">
                  Export
                </button>
                <button type="button" className="v7-btn-share">
                  Share
                </button>
                <button type="button" className="canvas-v7-icon-btn" aria-label="Layout">
                  <SvgIcon size={18}>
                    <rect x="3" y="4" width="18" height="16" rx="2" />
                    <line x1="15" y1="4" x2="15" y2="20" />
                  </SvgIcon>
                </button>
              </div>
            </MotionHeader>
          )}
        </AnimatePresence>

        <div
          className={`experience ${canvasOpen ? 'canvas-open' : ''} ${soloCanvas ? 'solo-canvas' : ''}`}
        >
          <section className="chat-pane">
            {!portalMode && !soloCanvas && (
              <div className="chat-header">
                <div>
                  <div className="eyebrow">V7 Go</div>
                  <h1>Build an agent in minutes</h1>
                </div>
                <div className="privacy-badge">
                  <span className="privacy-dot" />
                  Visible only to Shiv
                </div>
              </div>
            )}

            <div className="message-thread">
              {messages.map((message) => (
                <div
                  key={message.id}
                  className={`message ${message.type === 'user' ? 'is-user' : 'is-assistant'}`}
                >
                  {message.type === 'user' ? (
                    <div className="user-bubble">{message.text}</div>
                  ) : (
                    <AssistantMessage
                      blocks={message.blocks}
                      onDone={
                        message.id === activeStreamId
                          ? () => handleAssistantDone(message.id)
                          : undefined
                      }
                    />
                  )}
                </div>
              ))}

              {step === 'plan' && (
                <MotionDiv
                  className="plan-widget"
                  initial={{ opacity: 0, y: 18 }}
                  animate={{ opacity: 1, y: 0 }}
                >
                  <div className="plan-top">
                    <div>
                      <div className="plan-title">Quarterly Fund Reports</div>
                      <div className="plan-subtitle">
                        {selectedFocus} · {selectedOutcome}
                      </div>
                    </div>
                    <button
                      className="secondary-button"
                      onClick={() => setPlanExpanded((prev) => !prev)}
                    >
                      {planExpanded ? 'Hide details' : 'See details'}
                    </button>
                  </div>

                  <div className="plan-steps">
                    <div className="plan-step">
                      <h3>Bring each report into one consistent view</h3>
                      <p>
                        Use the Quarterly Fund Reports template to organize performance, holdings, allocations,
                        commentary, and risks in the same structure.
                      </p>
                    </div>
                    <div className="plan-step">
                      <h3>Surface the figures you review first</h3>
                      <p>
                        Prioritize performance and cash flow fields first, then pull in the supporting details
                        that explain what changed.
                      </p>
                    </div>
                    <div className="plan-step">
                      <h3>Give you a concise first pass to review</h3>
                      <p>
                        Create a concise performance summary with citations so you can review the quarter quickly
                        and go back to the source when needed.
                      </p>
                    </div>
                  </div>

                  <AnimatePresence>
                    {planExpanded && (
                      <motion.div
                        className="plan-details"
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                      >
                        <div className="detail-group">
                          <span>Template structure</span>
                          <p>
                            Performance Metrics, Top Holdings, Sector Allocation, Geographic Allocation,
                            Distribution Info, Fund Strategy Changes, Market Commentary Summary, Key Risks,
                            Performance Attribution, Benchmark Comparison
                          </p>
                        </div>
                        <div className="detail-group">
                          <span>Added on top</span>
                          <p>
                            Concise performance summary, review flags, source citations, and workflow-specific
                            emphasis on performance and cash flow figures
                          </p>
                        </div>
                        <div className="detail-group">
                          <span>Workflow logic</span>
                          <p>
                            Normalize manager-specific reporting into the template, keep evidence attached to each
                            key output, and surface a confident first-pass review workflow.
                          </p>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  <button className="build-button" onClick={handleBuild}>
                    Build it
                  </button>
                </MotionDiv>
              )}

              {step === 'evidence' && showInsights && (
                <MotionDiv
                  className="insight-stack"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                >
                  {teaserInsights.map((insight, index) => (
                    <MotionDiv
                      key={insight.id}
                      className="insight-card"
                      initial={{ opacity: 0, y: 18 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.14 }}
                    >
                      <p>{insight.title}</p>
                      <div className="citation-row">
                        {insight.chips.map((chip) => (
                          <button
                            key={`${insight.id}-${chip.label}`}
                            className={`citation-chip ${
                              activeCitation === chip.id ? 'is-active' : ''
                            }`}
                            onClick={() => handleCitationClick(chip.id)}
                          >
                            {chip.label}
                          </button>
                        ))}
                      </div>
                    </MotionDiv>
                  ))}
                </MotionDiv>
              )}

              {step === 'evidence' && showInsights && showWrapCeremonyBelow && (
                <MotionDiv
                  className="wrap-ceremony-below-insights"
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.38, ease: 'easeOut' }}
                >
                  <div className="message is-assistant">
                    <AssistantMessage
                      key={`wrap-ceremony-${selectedReportId ?? 'none'}`}
                      blocks={completionCeremonyBlocks}
                      onDone={() => setCompletionPromptReady(true)}
                    />
                  </div>
                </MotionDiv>
              )}

              <div ref={messageEndRef} />
            </div>

            {!portalMode && !soloCanvas && (
              <div className="composer-shell">
                <AnimatePresence>
                  {uploadMenuOpen && (
                    <MotionDiv
                      className="upload-popover"
                      initial={{ opacity: 0, y: 12 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: 10 }}
                    >
                      <button onClick={handleUploadClick}>Upload PDFs</button>
                      <button disabled>Pick from Drive</button>
                      <button disabled>Pick from Dropbox</button>
                    </MotionDiv>
                  )}
                </AnimatePresence>

                <MotionDiv
                  ref={questionCardRef}
                  className={`composer ${currentQuestion ? 'is-question-mode' : ''}`}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  tabIndex={currentQuestion ? 0 : -1}
                >
                  {currentQuestion ? (
                    <>
                      <div className="question-card-header composer-question-header">
                        <h3>{currentQuestion.prompt}</h3>
                        <span>{currentQuestion.label}</span>
                      </div>
                      <div className="question-card-options">
                        {questionOptions.map((option, index) => (
                          <button
                            key={option}
                            type="button"
                            className={`question-option ${
                              activeQuestionIndex === index ? 'is-active' : ''
                            } ${isFreeTextRow(index) ? 'is-free-text' : ''}`}
                            onMouseEnter={() => setActiveQuestionIndex(index)}
                            onClick={() => {
                              if (currentQuestion.id === 'completion') {
                                handleCompletion(option)
                                return
                              }
                              if (step === 'starter') {
                                handleStarterChoice(option)
                                return
                              }
                              handleQuestionChoice(step, option)
                            }}
                          >
                            <span className="question-option-index">{index + 1}.</span>
                            <span className="question-option-label">
                              {isFreeTextRow(index) && activeQuestionIndex === index ? (
                                <input
                                  ref={freeTextInputRef}
                                  data-free-text="true"
                                  className="question-free-input"
                                  value={freeTextDraft}
                                  placeholder={option}
                                  onChange={(event) =>
                                    setFreeTextDraft(event.target.value)
                                  }
                                  onClick={(event) => event.stopPropagation()}
                                  onKeyDown={handleFreeTextKeyDown}
                                />
                              ) : isFreeTextRow(index) && freeTextDraft.trim() ? (
                                <span className="question-free-text-value">
                                  {freeTextDraft}
                                </span>
                              ) : (
                                option
                              )}
                            </span>
                            <span className="question-option-actions">
                              {activeQuestionIndex === index && !isFreeTextRow(index) ? (
                                <span className="question-option-keys">↑ ↓</span>
                              ) : null}
                            </span>
                          </button>
                        ))}
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="composer-controls">
                        <button
                          className="plus-button"
                          onClick={handleUploadMenu}
                          disabled={activeStreamId !== null}
                        >
                          +
                        </button>
                        <span className="composer-hint">Ask a follow up, @ for context</span>
                        <button className="send-button" disabled>
                          →
                        </button>
                      </div>

                      <div className="option-grid" />
                    </>
                  )}
                </MotionDiv>
                <div className="question-card-footer composer-footer">
                  AI can sometimes make mistakes, but your privacy and security remain our top priority.
                </div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".pdf"
                  multiple
                  hidden
                  onChange={handleFilesSelected}
                />
              </div>
            )}
          </section>

          <AnimatePresence>
            {canvasOpen && (
              <MotionSection
                layout
                className="canvas-pane"
                initial={{ x: 64, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                exit={{ x: 64, opacity: 0 }}
                transition={{
                  duration: 0.5,
                  ease: [0.16, 1, 0.3, 1],
                  layout: { duration: 0.72, ease: [0.16, 1, 0.3, 1] },
                }}
              >
                {!portalMode && (
                  <header className="canvas-v7-nav">
                    <div className="canvas-v7-nav-left">
                      <nav className="canvas-v7-breadcrumb" aria-label="Breadcrumb">
                        <span className="canvas-v7-bc-link">Home</span>
                        <span className="canvas-v7-bc-sep" aria-hidden>
                          &gt;
                        </span>
                        <span className="canvas-v7-bc-link">Quarterly Fund Reports</span>
                        <span className="canvas-v7-draft-badge">
                          <span className="canvas-v7-draft-dot" aria-hidden />
                          Draft
                        </span>
                      </nav>
                    </div>
                    <div className="canvas-v7-nav-center">
                      <div className="canvas-v7-tabs" role="tablist" aria-label="Canvas mode">
                        <button type="button" className="canvas-v7-tab is-active" role="tab" aria-selected="true">
                          Build
                        </button>
                        <button type="button" className="canvas-v7-tab" role="tab" aria-selected="false">
                          Review
                        </button>
                        <button type="button" className="canvas-v7-tab" role="tab" aria-selected="false">
                          Visualize
                        </button>
                      </div>
                    </div>
                    <div className="canvas-v7-nav-right">
                      <button type="button" className="canvas-v7-icon-btn" aria-label="Toggle side panel">
                        <SvgIcon size={18}>
                          <rect x="3" y="4" width="18" height="16" rx="2" />
                          <line x1="15" y1="4" x2="15" y2="20" />
                        </SvgIcon>
                      </button>
                    </div>
                  </header>
                )}

                {['canvas-building', 'upload-ready', 'processing', 'select-report', 'evidence', 'handoff', 'portal'].includes(
                  step,
                ) && (
                  <div className={`data-surface ${step === 'evidence' ? 'data-surface-evidence' : 'data-surface-table'}`}>
                    {step !== 'evidence' ? (
                      <>
                        <div className="v7-table-toolbar">
                          <div className="v7-table-toolbar-left">
                            <button type="button" className="v7-toolbar-ic" aria-label="Sort">
                              <SvgIcon size={16} title="Sort">
                                <path d="M7 15l5 5 5-5" />
                                <path d="M17 9l-5-5-5 5" />
                              </SvgIcon>
                            </button>
                            <button type="button" className="v7-toolbar-ic" aria-label="Filter">
                              <SvgIcon size={16} title="Filter">
                                <path d="M22 3H2l8 9.46V19l4 2v-8.54L22 3z" />
                              </SvgIcon>
                            </button>
                          </div>
                          <div className="v7-table-toolbar-right">
                            <button type="button" className="v7-toolbar-text-btn">
                              <span className="v7-toolbar-plus">+</span> Add entity
                            </button>
                            <button type="button" className="v7-toolbar-text-btn">
                              <span className="v7-toolbar-plus">+</span> Add property
                            </button>
                          </div>
                        </div>

                        <div className="v7-table-scroll">
                          <table className="v7-data-table">
                            <colgroup>
                              <col className="v7-col-select" />
                              {tableColumns.map((column) => (
                                <col key={column.key} className={`v7-col-${column.key}`} />
                              ))}
                              <col className="v7-col-actions" />
                            </colgroup>
                            <thead>
                              <tr>
                                <th className="v7-th v7-th-select" scope="col">
                                  <input type="checkbox" aria-label="Select all rows" disabled />
                                </th>
                                {tableColumns.map((column) => (
                                  <th key={column.key} className="v7-th" scope="col">
                                    <span className="v7-th-inner">
                                      <span className="v7-th-icon">{headerIconForColumn(column.key)}</span>
                                      <span>{column.label}</span>
                                    </span>
                                  </th>
                                ))}
                                <th className="v7-th v7-th-actions" scope="col" aria-label="Column actions">
                                  <div className="v7-th-actions-inner">
                                    <button type="button" className="v7-th-action-btn" aria-label="Add column">
                                      +
                                    </button>
                                    <button type="button" className="v7-th-action-btn" aria-label="More">
                                      ···
                                    </button>
                                  </div>
                                </th>
                              </tr>
                            </thead>
                            <tbody>
                              {records.map((record, rowIndex) => (
                                <tr
                                  key={record.id}
                                  className={`v7-tr ${selectedReportId === record.id ? 'is-selected' : ''}`}
                                  onClick={() => handleSelectReport(record.id)}
                                  onKeyDown={(event) => {
                                    if (event.key === 'Enter' || event.key === ' ') {
                                      event.preventDefault()
                                      handleSelectReport(record.id)
                                    }
                                  }}
                                  role="button"
                                  tabIndex={0}
                                  aria-label={`Select row ${rowIndex + 1}`}
                                >
                                  <td className="v7-td v7-td-select">
                                    <span className="v7-row-num">{rowIndex + 1}</span>
                                    <input type="checkbox" tabIndex={-1} aria-label={`Row ${rowIndex + 1}`} disabled />
                                  </td>
                                  {tableColumns.map((column) => {
                                    const cell = getCellState(record, column)
                                    return (
                                      <td key={`${record.id}-${column.key}`} className="v7-td">
                                        {renderV7Cell(column, cell)}
                                      </td>
                                    )
                                  })}
                                  <td className="v7-td v7-td-trail" aria-hidden />
                                </tr>
                              ))}
                              {records.length > 0 && (
                                <tr className="v7-tr v7-tr-placeholder" aria-hidden>
                                  <td className="v7-td v7-td-select" />
                                  {tableColumns.map((column) => (
                                    <td key={`empty-${column.key}`} className="v7-td" />
                                  ))}
                                  <td className="v7-td v7-td-trail" />
                                </tr>
                              )}
                            </tbody>
                          </table>
                        </div>

                        <footer className="v7-canvas-footer">
                          <button type="button" className="v7-footer-new-entity">
                            + New entity
                          </button>
                          <div className="v7-footer-views">
                            <button type="button" className="v7-footer-view is-active">
                              <SvgIcon size={14}>
                                <rect x="3" y="3" width="7" height="7" rx="1" />
                                <rect x="14" y="3" width="7" height="7" rx="1" />
                                <rect x="3" y="14" width="7" height="7" rx="1" />
                                <rect x="14" y="14" width="7" height="7" rx="1" />
                              </SvgIcon>
                              Main {records.length || 4}
                            </button>
                            <button type="button" className="v7-footer-new-view">
                              + New view
                            </button>
                          </div>
                          <button type="button" className="v7-footer-help" aria-label="Help">
                            ?
                            <span className="v7-footer-help-dot" aria-hidden />
                          </button>
                        </footer>
                      </>
                    ) : (
                      <div className="evidence-layout">
                        <div className="pdf-frame">
                          <div className="pdf-toolbar">
                            <span>{selectedReport?.fileName}</span>
                            <span>File</span>
                          </div>
                          <div className="pdf-page">
                            <motion.img
                              key={activeCitation}
                              className="pdf-image"
                              src={evidenceImages[activeCitation]}
                              alt={
                                activeCitation === 'cover'
                                  ? 'Quarterly report cover page'
                                  : `Citation evidence ${activeCitation}`
                              }
                              initial={{ opacity: 0, scale: 0.985 }}
                              animate={{ opacity: 1, scale: 1 }}
                              transition={{ duration: 0.24, ease: 'easeOut' }}
                            />
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </MotionSection>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  )
}

export default App
