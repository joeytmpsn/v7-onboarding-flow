import { useCallback, useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import './App.css'

const promptFlow = [
  {
    id: 'starter',
    label: '',
    prompt: 'What agent can I help you build today?',
    options: [
      'Extract information from Quarterly Fund Reports',
      'Compare manager commentary across reports',
      'Track changes in allocation, exposures, and performance',
    ],
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
  },
]

const freeTextLabel = 'Somewhere else, share your thoughts'

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

const evidenceImages = {
  cover: '/evidence/report-cover.png',
  '1': '/evidence/citation-1.png',
  '2': '/evidence/citation-2.png',
  '4': '/evidence/citation-4.png',
  '6': '/evidence/citation-6.png',
  '8': '/evidence/citation-8.png',
}

const teaserInsights = [
  {
    id: 'insight-1',
    title: 'Performance improved late in the quarter, but benchmark-relative returns still finished soft.',
    chips: [
      { id: '1', label: '1' },
      { id: '2', label: '2' },
    ],
  },
  {
    id: 'insight-2',
    title: 'The manager rotated toward broader MBS exposure and higher-quality cyclicals during the quarter.',
    chips: [
      { id: '4', label: '4' },
      { id: '6', label: '6' },
    ],
  },
  {
    id: 'insight-3',
    title: 'The risk read-through is still dominated by sticky inflation, elevated rates, and a softer consumer backdrop.',
    chips: [
      { id: '8', label: '8' },
    ],
  },
]

const portalAgents = ['Quarterly Fund Reports', 'Quarterly Fund Reports 2']

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

          for (let charIndex = 1; charIndex <= block.length; charIndex += 1) {
            if (cancelled) {
              return
            }

            setTypedBlocks((prev) =>
              prev.map((value, index) =>
                index === blockIndex ? block.slice(0, charIndex) : value,
              ),
            )

            await new Promise((resolve) => {
              timeoutId = window.setTimeout(resolve, Math.max(10, 280 / block.length))
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

      {typedBlocks.map((block, index) =>
        block ? (
          <p key={`${blocks[index]}-${index}`}>
            {block.trim().endsWith('?') ? <strong>{block}</strong> : block}
            {phase === 'streaming' && typedBlocks[index] === blocks[index] && index === typedBlocks.filter(Boolean).length - 1 ? (
              <span className="stream-cursor" />
            ) : null}
          </p>
        ) : null,
      )}
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
        "I can help you build document workflows, research flows, and review-ready agents that turn messy information into something structured and useful.",
        'As it is around the end of the quarter, I can help you get through reporting work faster by pulling the key fields from quarterly fund reports, keeping the evidence attached, and getting you to a confident first pass much sooner than you normally would.',
        'Visible only to you right now. Your documents stay private and confidential unless you choose to share the agent later.',
        'What agent can I help you build today?',
      ],
    },
  ])
  const [step, setStep] = useState('starter')
  const [answers, setAnswers] = useState({})
  const [planExpanded, setPlanExpanded] = useState(false)
  const [canvasOpen, setCanvasOpen] = useState(false)
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
  const fileInputRef = useRef(null)
  const freeTextInputRef = useRef(null)
  const messageEndRef = useRef(null)
  const questionCardRef = useRef(null)
  const messageIdRef = useRef(1)
  const selectedFocus = answers.q1 || 'Performance and cash flow figures'
  const selectedOutcome = answers.q2 || 'A concise performance summary'
  const currentQuestion =
    activeStreamId === null
      ? promptFlow.find((question) => question.id === step)
      : null
  const questionOptions = currentQuestion
    ? [...currentQuestion.options, freeTextLabel]
    : []

  useEffect(() => {
    messageEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' })
  }, [messages, step, planExpanded, showInsights])

  useEffect(() => {
    if (step === 'starter' || step === 'q1' || step === 'q2') {
      questionCardRef.current?.focus()
    }
  }, [step])

  useEffect(() => {
    if (!currentQuestion) {
      return
    }

    if (activeQuestionIndex === questionOptions.length - 1) {
      freeTextInputRef.current?.focus()
    }
  }, [activeQuestionIndex, currentQuestion, questionOptions.length])

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
              'I have built this on top of our existing Quarterly Fund Reports template and tuned it around the way you work at quarter-end.',
              'It is set up to bring each report into one consistent view, pull out the figures you review first, and create a concise first pass you can actually work from.',
              'When you upload a few PDFs, I will start extracting the key fields straight away, surface useful insights, and show you how V7 ties every citation back to observable evidence in the connected files.',
              'Whenever you are ready, drop in a few quarterly reports and I will get to work.',
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
            'The first pass is ready. Pick one report from the canvas and I will pull out a few evidence-backed takeaways worth reviewing first.',
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
    if (completionChoice !== 'Explore this agent') {
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

  const handleStarterChoice = useCallback((choice) => {
    addUserMessage(choice)
    addAssistantMessage(
      [
        'A good one to start with. We already have a Quarterly Fund Reports template, so I will build on that rather than make you configure this from scratch.',
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
        "I've put together a plan for your agent based on your answers. We’ll start from the existing Quarterly Fund Reports template, emphasise performance and cash flow fields, and add a concise performance summary with citations so it is immediately useful this quarter.",
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

      if (pendingStep) {
        setStep(pendingStep)
        setPendingStep(null)
      }
    },
    [activeStreamId, pendingStep],
  )

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
        const choice =
          activeQuestionIndex === currentQuestion.options.length
            ? freeTextDraft.trim() || freeTextLabel
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
      const choice = freeTextDraft.trim() || freeTextLabel

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
    addAssistantMessage(['I pulled out three things worth reviewing first.'], 'evidence')
  }

  const handleCitationClick = (sectionId) => {
    setActiveCitation(sectionId)
  }

  const handleCompletion = (choice) => {
    setCompletionChoice(choice)
    addUserMessage(choice)
    if (choice === 'Explore this agent') {
      addAssistantMessage(
        [
          'You are good to go. I have left everything in place so you can step straight into the live agent experience.',
        ],
        'handoff',
      )
      return
    }

    addAssistantMessage([
      'Great. You can stay in setup mode and start another agent from the same workspace.',
    ])
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
            <div className="workspace-pill">Talent Design Workspace</div>
            <nav className="portal-nav">
              {['Home', 'Search', 'Knowledge', 'Skills', 'Integrations', 'Support'].map(
                (item) => (
                  <button key={item} className="nav-link">
                    {item}
                  </button>
                ),
              )}
            </nav>
            <div className="agent-panel">
              <div className="agent-tabs">
                <button className="tab is-active">Agents</button>
                <button className="tab">Chats</button>
              </div>
              <input className="agent-search" value="Search agents" readOnly />
              <button className="create-agent">+ Create a new Agent</button>
              <div className="agent-list">
                {portalAgents.map((agent) => (
                  <button
                    key={agent}
                    className={`agent-row ${agent === portalAgents[0] ? 'is-active' : ''}`}
                  >
                    {agent}
                  </button>
                ))}
              </div>
            </div>
          </MotionAside>
        )}
      </AnimatePresence>

      <div className="workspace">
        <AnimatePresence>
          {portalMode && (
            <MotionHeader
              className="portal-header"
              initial={{ y: -18, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ duration: 0.45, delay: 0.15 }}
            >
              <div className="breadcrumbs">Home / Quarterly Fund Reports / Draft</div>
              <div className="header-actions">
                <button>Export</button>
                <button className="dark">Share</button>
              </div>
            </MotionHeader>
          )}
        </AnimatePresence>

        <div className={`experience ${canvasOpen ? 'canvas-open' : ''}`}>
          <section className="chat-pane">
            {!portalMode && (
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
                      <p>Use the Quarterly Fund Reports template to organise performance, holdings, allocations, commentary, and risks in the same structure.</p>
                    </div>
                    <div className="plan-step">
                      <h3>Surface the figures you review first</h3>
                      <p>Prioritise performance and cash flow fields first, then pull in the supporting details that explain what changed.</p>
                    </div>
                    <div className="plan-step">
                      <h3>Give you a concise first pass to review</h3>
                      <p>Create a concise performance summary with citations so you can review the quarter quickly and go back to the source when needed.</p>
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
                          <p>Performance Metrics, Top Holdings, Sector Allocation, Geographic Allocation, Distribution Info, Fund Strategy Changes, Market Commentary Summary, Key Risks, Performance Attribution, Benchmark Comparison</p>
                        </div>
                        <div className="detail-group">
                          <span>Added on top</span>
                          <p>Concise performance summary, review flags, source citations, and workflow-specific emphasis on performance and cash flow figures</p>
                        </div>
                        <div className="detail-group">
                          <span>Workflow logic</span>
                          <p>Normalise manager-specific reporting into the template, keep evidence attached to each key output, and surface a confident first-pass review workflow.</p>
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

              {step === 'evidence' && showInsights && (
                <MotionDiv
                  className="completion-card"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.5 }}
                >
                  <h3>You’re good to go</h3>
                  <p>Your new agent is ready. Do you want to explore it now or create another one?</p>
                  <div className="completion-actions">
                    {['Explore this agent', 'Create another one'].map((choice) => (
                      <button
                        key={choice}
                        className={`option-pill ${
                          completionChoice === choice ? 'is-selected' : ''
                        }`}
                        onClick={() => handleCompletion(choice)}
                      >
                        {choice}
                      </button>
                    ))}
                  </div>
                </MotionDiv>
              )}

              <div ref={messageEndRef} />
            </div>

            {!portalMode && (
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
                            className={`question-option ${
                              activeQuestionIndex === index ? 'is-active' : ''
                            } ${index === questionOptions.length - 1 ? 'is-free-text' : ''}`}
                            onMouseEnter={() => setActiveQuestionIndex(index)}
                            onClick={() =>
                              step === 'starter'
                                ? handleStarterChoice(option)
                                : handleQuestionChoice(step, option)
                            }
                          >
                            <span className="question-option-index">{index + 1}.</span>
                            <span className="question-option-label">
                              {index === questionOptions.length - 1 &&
                              activeQuestionIndex === index ? (
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
                              ) : index === questionOptions.length - 1 &&
                                freeTextDraft.trim() ? (
                                <span className="question-free-text-value">
                                  {freeTextDraft}
                                </span>
                              ) : (
                                option
                              )}
                            </span>
                            <span className="question-option-actions">
                              {activeQuestionIndex === index &&
                              index !== questionOptions.length - 1 ? (
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
                {currentQuestion ? (
                  <div className="question-card-footer composer-footer">
                    AI can sometimes make mistakes, but your privacy and security remain our top priority.
                  </div>
                ) : null}
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
                className="canvas-pane"
                initial={{ x: 64, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                exit={{ x: 64, opacity: 0 }}
                transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
              >
                <div className="canvas-header">
                  <div>
                    <div className="eyebrow">Quarterly Fund Reports</div>
                    <h2>{step === 'evidence' ? selectedReport?.fileName : 'Build'}</h2>
                  </div>
                  <div className="canvas-tabs">
                    <button className="tab is-active">Build</button>
                    <button className="tab">Review</button>
                    <button className="tab">Visualize</button>
                  </div>
                </div>

                {['canvas-building', 'upload-ready', 'processing', 'select-report', 'evidence', 'handoff', 'portal'].includes(
                  step,
                ) && (
                  <div className="data-surface">
                    {step !== 'evidence' ? (
                      <>
                        <div className="table-header">
                          {tableColumns.map((column) => (
                            <div key={column.key}>{column.label}</div>
                          ))}
                        </div>

                        <div className="table-body">
                          {records.map((record) => (
                            <button
                              key={record.id}
                              className={`table-row ${
                                selectedReportId === record.id ? 'is-selected' : ''
                              }`}
                              onClick={() => handleSelectReport(record.id)}
                            >
                              {tableColumns.map((column) => {
                                const cell = getCellState(record, column)

                                return (
                                  <span
                                    key={`${record.id}-${column.key}`}
                                    className={`table-cell ${cell.className}`}
                                  >
                                    {cell.value}
                                  </span>
                                )
                              })}
                            </button>
                          ))}
                        </div>
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
