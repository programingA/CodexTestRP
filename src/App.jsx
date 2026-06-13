import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  backtestSummary as fallbackBacktest,
  demoPredictions,
  featureImportance as fallbackFeatures,
  metricSummary as fallbackMetrics,
  modelMeta as fallbackMeta,
} from './data/demoData'
import './App.css'

const API_BASE = 'http://127.0.0.1:8765'

const fallbackSymbols = demoPredictions.map((item) => ({
  symbol: item.symbol,
  sector: item.sector,
  latestDate: item.date,
  latestClose: item.adjClose,
  availableRows: 1,
}))

const fallbackBootstrap = {
  runtime: 'cached-fallback',
  readyMs: 0,
  modelDir: fallbackMeta.source,
  meta: fallbackMeta,
  symbols: fallbackSymbols,
  metrics: fallbackMetrics,
  features: fallbackFeatures,
  backtest: fallbackBacktest,
}

const formatPercent = (value, digits = 2) =>
  `${new Intl.NumberFormat('ko-KR', {
    maximumFractionDigits: digits,
    minimumFractionDigits: digits,
  }).format((value ?? 0) * 100)}%`

const formatSignedPercent = (value, digits = 2) =>
  `${value >= 0 ? '+' : ''}${formatPercent(value ?? 0, digits)}`

const formatNumber = (value, digits = 2) =>
  new Intl.NumberFormat('ko-KR', {
    maximumFractionDigits: digits,
    minimumFractionDigits: digits,
  }).format(value ?? 0)

const simplifyFeatureLabel = (label = '') =>
  label
    .replaceAll('로그 수익률', '최근 가격 변화율')
    .replaceAll('1일 수익률', '하루 수익률')
    .replaceAll('S&P 500 수익률', '시장 전체 흐름')
    .replaceAll('섹터 평균 수익률', '같은 업종 흐름')
    .replaceAll('이동평균 이격', '평균 가격과의 거리')
    .replaceAll('시가 대비 종가 수익률', '장중 가격 흐름')
    .replaceAll('입력 구간', '최근 관찰 구간')
    .replaceAll('마지막 값', '가장 최근 값')

const featureCategory = (feature = '', label = '') => {
  const text = `${feature} ${label}`.toLowerCase()
  if ((text.includes('market') || label.includes('S&P')) && label.includes('변동성')) {
    return {
      name: '시장 변동성',
      description: '전체 시장이 최근 얼마나 흔들렸는지 봅니다.',
    }
  }
  if ((text.includes('sector') || label.includes('섹터')) && label.includes('변동성')) {
    return {
      name: '업종 변동성',
      description: '같은 업종의 가격 흐름이 얼마나 흔들렸는지 봅니다.',
    }
  }
  if (text.includes('volatility') || label.includes('변동성')) {
    return {
      name: '변동성',
      description: '가격이 얼마나 흔들렸는지 보는 지표입니다.',
    }
  }
  if (text.includes('market') || label.includes('S&P')) {
    return {
      name: '시장 흐름',
      description: '개별 종목이 전체 시장 분위기와 함께 움직였는지 봅니다.',
    }
  }
  if (text.includes('sector') || label.includes('섹터')) {
    return {
      name: '업종 흐름',
      description: '같은 업종 안에서 비슷한 움직임이 있었는지 봅니다.',
    }
  }
  if (text.includes('ma') || label.includes('이동평균')) {
    return {
      name: '추세 위치',
      description: '현재 가격이 최근 평균 가격보다 높은지 낮은지 봅니다.',
    }
  }
  if (text.includes('volume') || label.includes('거래')) {
    return {
      name: '거래량',
      description: '가격 움직임에 거래량 변화가 같이 있었는지 봅니다.',
    }
  }
  return {
    name: '가격 변화',
    description: '최근 가격이 어느 방향으로 움직였는지 봅니다.',
  }
}

const contributionDirection = (value = 0) => {
  if (value > 0) {
    return {
      label: '상승 쪽 근거',
      tone: 'positive',
      sentence: '모델 판단을 상승 쪽으로 조금 밀었습니다.',
    }
  }
  if (value < 0) {
    return {
      label: '하락/관망 근거',
      tone: 'negative',
      sentence: '모델 판단을 관망 쪽으로 조금 밀었습니다.',
    }
  }
  return {
    label: '중립 근거',
    tone: 'neutral',
    sentence: '이번 판단에서 방향을 거의 바꾸지 않았습니다.',
  }
}

const confidenceText = (prediction) => {
  const probability = prediction?.probabilityUp ?? 0
  const threshold = prediction?.selectedThreshold ?? 0.5
  const gap = Math.abs(probability - threshold)
  if (gap < 0.03) return '기준선과 차이가 작아서 강한 신호로 보기 어렵습니다.'
  if (gap < 0.08) return '기준선과 어느 정도 차이가 있지만, 보수적으로 해석할 필요가 있습니다.'
  return '기준선과 차이가 비교적 커서 모델 신호가 뚜렷한 편입니다.'
}

const listFeatureNames = (items) => {
  const names = items.map((item) => simplifyFeatureLabel(item.label)).slice(0, 3)
  if (!names.length) return '뚜렷한 개별 근거 없음'
  return names.join(', ')
}

const buildPlainReport = ({
  bootstrap,
  contributionItems,
  hasActualResult,
  matched,
  prediction,
}) => {
  if (!prediction) return []

  const horizon = bootstrap.meta?.horizon ?? 5
  const seqLen = bootstrap.meta?.seqLen ?? 30
  const returnThreshold = bootstrap.meta?.returnThreshold ?? 0.01
  const positiveItems = contributionItems.filter((item) => item.value > 0)
  const negativeItems = contributionItems.filter((item) => item.value < 0)
  const modelResult = prediction.predictedUp ? '상승 후보' : '관망 후보'
  const validationText = hasActualResult
    ? `이 날짜는 과거 데이터라서 사후 정답도 같이 표시합니다. 실제 ${horizon}거래일 수익률은 ${formatSignedPercent(
        prediction.futureReturn ?? 0,
      )}였고, 모델 판단은 ${matched ? '실제 방향과 일치했습니다' : '실제 방향과 달랐습니다'}.`
    : '직접 입력한 데이터는 아직 미래 종가를 알 수 없으므로 사후 검증값을 표시하지 않습니다.'

  return [
    {
      title: '무엇을 예측했나',
      body: `${prediction.date} 기준으로 이미 알 수 있는 최근 ${seqLen}거래일 데이터만 사용했습니다. 모델은 그 다음 ${horizon}거래일 동안 수익률이 ${formatPercent(
        returnThreshold,
      )}를 넘을 가능성을 추정합니다.`,
    },
    {
      title: '이번 판단',
      body: `상승 기준을 넘길 확률은 ${formatPercent(
        prediction.probabilityUp ?? 0,
      )}이고, 모델의 분류 기준은 ${formatPercent(
        prediction.selectedThreshold ?? 0.5,
        0,
      )}입니다. 그래서 이번 결과는 ${modelResult}로 표시했습니다. ${confidenceText(
        prediction,
      )}`,
    },
    {
      title: '왜 그렇게 봤나',
      body: `상승 쪽으로 작용한 근거는 ${listFeatureNames(
        positiveItems,
      )}입니다. 반대로 관망 쪽으로 작용한 근거는 ${listFeatureNames(
        negativeItems,
      )}입니다. 이 항목들은 절대 수치보다 방향성이 중요하며, 여러 작은 근거가 합산되어 최종 확률을 만듭니다.`,
    },
    {
      title: '가격 흐름 해석',
      body: `최근 관찰 구간 전체 수익률은 ${formatSignedPercent(
        prediction.context?.return_window ?? 0,
      )}, 최근 5거래일 흐름은 ${formatSignedPercent(
        prediction.context?.return_5d ?? 0,
      )}, 직전 하루 흐름은 ${formatSignedPercent(
        prediction.context?.return_1d ?? 0,
      )}입니다. 모델은 이 흐름을 시장/업종 흐름과 함께 비교해 판단했습니다.`,
    },
    {
      title: '검증값을 보는 법',
      body: validationText,
    },
  ]
}

const buildSyntheticCsv = () => {
  const rows = ['Date,Open,High,Low,Close,Adj Close,Volume,market_return']
  const start = new Date('2024-08-05T00:00:00')
  let tradingDay = 0

  for (let dayOffset = 0; rows.length < 96; dayOffset += 1) {
    const date = new Date(start)
    date.setDate(start.getDate() + dayOffset)
    const weekday = date.getDay()
    if (weekday === 0 || weekday === 6) continue

    const trend = tradingDay * 0.42
    const wave = Math.sin(tradingDay / 4) * 2.7
    const dip = tradingDay > 54 && tradingDay < 65 ? -4.5 : 0
    const close = 96 + trend + wave + dip
    const open = close - 0.55 + Math.cos(tradingDay / 5) * 0.8
    const high = Math.max(open, close) + 1.35 + Math.sin(tradingDay / 7) * 0.35
    const low = Math.min(open, close) - 1.1 - Math.cos(tradingDay / 6) * 0.3
    const volume = Math.round(1120000 + tradingDay * 9200 + Math.abs(Math.sin(tradingDay / 3)) * 175000)
    const marketReturn = 0.0012 + Math.sin(tradingDay / 8) * 0.004

    rows.push(
      [
        date.toISOString().slice(0, 10),
        open.toFixed(2),
        high.toFixed(2),
        low.toFixed(2),
        close.toFixed(2),
        close.toFixed(2),
        volume,
        marketReturn.toFixed(6),
      ].join(','),
    )
    tradingDay += 1
  }

  return rows.join('\n')
}

const modelDecision = (prediction) => {
  if (!prediction) return '-'
  return prediction.predictedUp ? '+1% 초과 상승 후보' : '상승 기준 미달'
}

const decisionTone = (prediction) => {
  if (!prediction) return 'neutral'
  if (prediction.predictedUp) return 'positive'
  if (prediction.probabilityUp >= 0.44) return 'watch'
  return 'negative'
}

const buildFallbackPrediction = (symbol, date) => {
  const item =
    demoPredictions.find((prediction) => prediction.symbol === symbol) ??
    demoPredictions[0]

  return {
    ...item,
    runtime: 'cached-fallback',
    elapsedMs: 0,
    date: date || item.date,
    probabilityDown: 1 - item.probabilityUp,
    naturalExplanation: `${item.symbol}의 저장된 샘플 결과입니다. 실제 Python API가 꺼져 있어 사전 추출 데이터로 표시합니다. 상승 확률은 ${formatPercent(
      item.probabilityUp,
    )}이고, 기준 확률 50%보다 낮아 상승 기준 미달로 분류됩니다.`,
  }
}

async function readJson(url) {
  const response = await fetch(url)
  if (!response.ok) {
    const error = await response.json().catch(() => ({}))
    throw new Error(error.error || `Request failed: ${response.status}`)
  }
  return response.json()
}

async function postJson(url, payload) {
  const response = await fetch(url, {
    body: JSON.stringify(payload),
    headers: { 'Content-Type': 'application/json' },
    method: 'POST',
  })
  if (!response.ok) {
    const error = await response.json().catch(() => ({}))
    throw new Error(error.error || `Request failed: ${response.status}`)
  }
  return response.json()
}

function PriceChart({ values }) {
  const [hoverIndex, setHoverIndex] = useState(null)
  const numericValues = (values ?? [])
    .map((value) => Number(value))
    .filter((value) => Number.isFinite(value))
  const data = numericValues.length >= 2 ? numericValues : [0, 0]
  const min = Math.min(...data)
  const max = Math.max(...data)
  const spread = max - min || 1
  const first = data[0]
  const last = data[data.length - 1]
  const change = first ? last / first - 1 : 0
  const coordinates = data.map((value, index) => {
    const x = (index / (data.length - 1)) * 100
    const y = 54 - ((value - min) / spread) * 46
    return { index, value, x, y }
  })
  const points = coordinates
    .map((point) => `${point.x.toFixed(2)},${point.y.toFixed(2)}`)
    .join(' ')
  const lastY = 54 - ((last - min) / spread) * 46
  const boundedHoverIndex =
    hoverIndex === null ? null : Math.max(0, Math.min(hoverIndex, data.length - 1))
  const activePoint = boundedHoverIndex === null ? null : coordinates[boundedHoverIndex]
  const previousValue = activePoint ? data[Math.max(0, activePoint.index - 1)] : null
  const pointChange =
    activePoint && previousValue ? activePoint.value / previousValue - 1 : 0

  const handlePointerMove = (event) => {
    const rect = event.currentTarget.getBoundingClientRect()
    const ratio = Math.max(0, Math.min(1, (event.clientX - rect.left) / rect.width))
    setHoverIndex(Math.round(ratio * (data.length - 1)))
  }

  return (
    <div className="price-chart">
      <div className="chart-scale">
        <span>High ${formatNumber(max)}</span>
        <span>Low ${formatNumber(min)}</span>
      </div>
      <div className="chart-canvas">
        <svg className="price-chart-svg" viewBox="0 0 100 60" aria-hidden="true">
          <line className="chart-grid-line" x1="0" x2="100" y1="8" y2="8" />
          <line className="chart-grid-line" x1="0" x2="100" y1="31" y2="31" />
          <line className="chart-grid-line" x1="0" x2="100" y1="54" y2="54" />
          <polyline className="chart-area" points={`0,58 ${points} 100,58`} />
          <polyline className="chart-line" points={points} />
          <circle className="chart-endpoint" cx="100" cy={lastY.toFixed(2)} r="2.4" />
          {activePoint && (
            <g className="chart-hover">
              <line
                x1={activePoint.x.toFixed(2)}
                x2={activePoint.x.toFixed(2)}
                y1="8"
                y2="54"
              />
              <circle
                cx={activePoint.x.toFixed(2)}
                cy={activePoint.y.toFixed(2)}
                r="2.8"
              />
            </g>
          )}
          <rect
            className="chart-hitbox"
            height="60"
            onPointerLeave={() => setHoverIndex(null)}
            onPointerMove={handlePointerMove}
            width="100"
            x="0"
            y="0"
          />
        </svg>
        {activePoint && (
          <div
            className={`chart-tooltip ${
              activePoint.x < 12 ? 'left-edge' : activePoint.x > 88 ? 'right-edge' : ''
            }`}
            style={{
              left: `${activePoint.x}%`,
              top: `${(activePoint.y / 60) * 100}%`,
            }}
          >
            <span>Day {activePoint.index + 1}</span>
            <strong>${formatNumber(activePoint.value)}</strong>
            <small>{formatSignedPercent(pointChange)} vs prev</small>
          </div>
        )}
      </div>
      <div className="chart-footer">
        <span>Start ${formatNumber(first)}</span>
        <strong className={change >= 0 ? 'positive' : 'negative'}>
          {formatSignedPercent(change)} / Now ${formatNumber(last)}
        </strong>
      </div>
    </div>
  )
}

function ProbabilityGauge({ prediction }) {
  const probability = prediction?.probabilityUp ?? 0
  const dash = Math.max(0, Math.min(probability, 1)) * 339

  return (
    <div className={`probability-gauge ${decisionTone(prediction)}`}>
      <svg viewBox="0 0 132 132" aria-hidden="true">
        <circle className="gauge-bg" cx="66" cy="66" r="54" />
        <circle
          className="gauge-value"
          cx="66"
          cy="66"
          r="54"
          style={{ strokeDasharray: `${dash} 339` }}
        />
      </svg>
      <div>
        <span>상승 확률</span>
        <strong>{formatPercent(probability, 2)}</strong>
        <small>기준 {formatPercent(prediction?.selectedThreshold ?? 0.5, 0)}</small>
      </div>
    </div>
  )
}

function Kpi({ label, value, tone = 'neutral' }) {
  return (
    <div className={`kpi ${tone}`}>
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  )
}

function App() {
  const [bootstrap, setBootstrap] = useState(fallbackBootstrap)
  const [apiStatus, setApiStatus] = useState('checking')
  const [selectedSymbol, setSelectedSymbol] = useState(fallbackSymbols[0].symbol)
  const [dateOptions, setDateOptions] = useState([fallbackSymbols[0].latestDate])
  const [selectedDate, setSelectedDate] = useState(fallbackSymbols[0].latestDate)
  const [prediction, setPrediction] = useState(() =>
    buildFallbackPrediction(fallbackSymbols[0].symbol, fallbackSymbols[0].latestDate),
  )
  const [activeView, setActiveView] = useState('explain')
  const [isRunning, setIsRunning] = useState(false)
  const [isCustomOpen, setIsCustomOpen] = useState(false)
  const [customSymbol, setCustomSymbol] = useState('TESTAI')
  const [customSector, setCustomSector] = useState('Technology')
  const [customCsv, setCustomCsv] = useState('')
  const [customMessage, setCustomMessage] = useState('')
  const [isCustomLoading, setIsCustomLoading] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')

  const symbols = bootstrap.symbols?.length ? bootstrap.symbols : fallbackSymbols
  const selectedSymbolInfo = useMemo(
    () => symbols.find((item) => item.symbol === selectedSymbol) ?? symbols[0],
    [selectedSymbol, symbols],
  )
  const selectedLatestDate = selectedSymbolInfo?.latestDate
  const selectedSector = selectedSymbolInfo?.sector ?? ''

  useEffect(() => {
    let cancelled = false

    async function loadBootstrap() {
      try {
        const data = await readJson(`${API_BASE}/api/bootstrap`)
        if (cancelled) return
        setBootstrap(data)
        setApiStatus('online')
        setSelectedSymbol((current) => current || data.symbols[0]?.symbol || 'NVDA')
        setErrorMessage('')
      } catch (error) {
        if (cancelled) return
        setApiStatus('offline')
        setBootstrap(fallbackBootstrap)
        setErrorMessage(error.message)
      }
    }

    loadBootstrap()
    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    let cancelled = false

    async function loadDates() {
      if (apiStatus !== 'online') {
        const latest =
          selectedLatestDate ??
          demoPredictions.find((item) => item.symbol === selectedSymbol)?.date
        if (!latest) return
        setDateOptions([latest])
        setSelectedDate((current) => (current === latest ? current : latest))
        return
      }

      try {
        const data = await readJson(`${API_BASE}/api/dates?symbol=${selectedSymbol}`)
        if (cancelled) return
        const dates = data.dates?.length ? data.dates : [selectedLatestDate]
        setDateOptions(dates)
        setSelectedDate((current) => (dates.includes(current) ? current : dates[0]))
      } catch (error) {
        if (cancelled) return
        setErrorMessage(error.message)
      }
    }

    loadDates()
    return () => {
      cancelled = true
    }
  }, [apiStatus, selectedLatestDate, selectedSymbol])

  const runPrediction = useCallback(async () => {
    const startedAt = performance.now()
    setIsRunning(true)
    setErrorMessage('')

    try {
      if (apiStatus === 'online') {
        const data = await readJson(
          `${API_BASE}/api/predict?symbol=${selectedSymbol}&date=${selectedDate}`,
        )
        setPrediction(data)
      } else {
        await new Promise((resolve) => window.setTimeout(resolve, 450))
        setPrediction(buildFallbackPrediction(selectedSymbol, selectedDate))
      }
    } catch (error) {
      setErrorMessage(error.message)
      setPrediction(buildFallbackPrediction(selectedSymbol, selectedDate))
    } finally {
      const elapsed = performance.now() - startedAt
      const remaining = Math.max(0, 700 - elapsed)
      window.setTimeout(() => setIsRunning(false), remaining)
    }
  }, [apiStatus, selectedDate, selectedSymbol])

  const openCustomInput = useCallback(() => {
    setCustomMessage(
      apiStatus === 'online' ? '' : '직접 입력 예측은 Python API 연결이 필요합니다.',
    )
    setIsCustomOpen(true)
  }, [apiStatus])

  const loadSampleCsv = useCallback(async () => {
    setIsCustomLoading(true)
    setCustomMessage('')
    try {
      if (apiStatus !== 'online') {
        throw new Error('직접 입력 예측은 Python API 연결이 필요합니다.')
      }
      const sampleSymbol = customSymbol.trim().toUpperCase()
      if (!sampleSymbol) {
        throw new Error('샘플을 불러올 종목 코드를 먼저 입력해 주세요.')
      }
      const data = await readJson(
        `${API_BASE}/api/sample-csv?symbol=${encodeURIComponent(sampleSymbol)}`,
      )
      const matchedSymbol = symbols.find((item) => item.symbol === sampleSymbol)
      setCustomCsv(data.csv ?? '')
      setCustomSymbol(data.symbol ?? sampleSymbol)
      setCustomSector(matchedSymbol?.sector ?? customSector)
      setCustomMessage(`${data.symbol ?? sampleSymbol} 샘플 CSV를 불러왔습니다.`)
    } catch (error) {
      setCustomMessage(error.message)
    } finally {
      setIsCustomLoading(false)
    }
  }, [apiStatus, customSector, customSymbol, symbols])

  const fillSyntheticData = useCallback(() => {
    setCustomSymbol('TESTAI')
    setCustomSector('Technology')
    setCustomCsv(buildSyntheticCsv())
    setCustomMessage('가상 종목 TESTAI의 95거래일 테스트 데이터를 채웠습니다.')
  }, [])

  const runCustomPrediction = useCallback(async () => {
    const startedAt = performance.now()
    setIsCustomLoading(true)
    setCustomMessage('')
    setErrorMessage('')

    try {
      if (apiStatus !== 'online') {
        throw new Error('직접 입력 예측은 Python API 연결이 필요합니다.')
      }
      const data = await postJson(`${API_BASE}/api/custom-predict`, {
        csv: customCsv,
        sector: customSector,
        symbol: customSymbol,
      })
      setPrediction(data)
      setActiveView('explain')
      setIsCustomOpen(false)
    } catch (error) {
      setCustomMessage(error.message)
    } finally {
      const elapsed = performance.now() - startedAt
      const remaining = Math.max(0, 700 - elapsed)
      window.setTimeout(() => setIsCustomLoading(false), remaining)
    }
  }, [apiStatus, customCsv, customSector, customSymbol])

  useEffect(() => {
    let cancelled = false

    async function runInitialPrediction() {
      if (!selectedSymbol || !selectedDate) return
      try {
        if (apiStatus === 'online') {
          const data = await readJson(
            `${API_BASE}/api/predict?symbol=${selectedSymbol}&date=${selectedDate}`,
          )
          if (!cancelled) setPrediction(data)
        } else if (apiStatus === 'offline') {
          setPrediction(buildFallbackPrediction(selectedSymbol, selectedDate))
        }
      } catch {
        if (!cancelled) setPrediction(buildFallbackPrediction(selectedSymbol, selectedDate))
      }
    }

    runInitialPrediction()
    return () => {
      cancelled = true
    }
  }, [apiStatus, selectedDate, selectedSymbol])

  const hasActualResult = prediction?.actualUp !== undefined && prediction?.actualUp !== null
  const matched = hasActualResult && prediction?.predictedUp === prediction?.actualUp
  const activeMetric =
    bootstrap.metrics?.find((item) => item.split === 'test') ?? fallbackMetrics[2]
  const sourceLabel =
    prediction?.runtime === 'python-model'
      ? 'Python 모델 실시간 응답'
      : prediction?.runtime === 'python-model-custom'
        ? '사용자 입력 실시간 응답'
        : '캐시 fallback'
  const displaySymbol = prediction?.symbol ?? selectedSymbol
  const contributionItems = useMemo(
    () =>
      (prediction?.topContributions ?? []).map((item, index) => {
        const direction = contributionDirection(item.value)
        const category = featureCategory(item.name, item.label)
        return {
          ...item,
          category,
          direction,
          displayLabel: simplifyFeatureLabel(item.label),
          rank: index + 1,
        }
      }),
    [prediction],
  )
  const featureItems = useMemo(() => {
    const items = (bootstrap.features ?? []).slice(0, 8)
    const topImportance = items[0]?.importance || 1
    return items.map((item, index) => {
      const category = featureCategory(item.feature, item.label)
      return {
        ...item,
        category,
        displayLabel: simplifyFeatureLabel(item.label),
        rank: index + 1,
        relativeImportance: Math.max(1, Math.round(((item.importance ?? 0) / topImportance) * 100)),
      }
    })
  }, [bootstrap.features])
  const plainReport = useMemo(
    () =>
      buildPlainReport({
        bootstrap,
        contributionItems,
        hasActualResult,
        matched,
        prediction,
      }),
    [bootstrap, contributionItems, hasActualResult, matched, prediction],
  )

  return (
    <main className="terminal-shell">
      <aside className="sidebar">
        <div className="brand-block">
          <span className="brand-mark">SA</span>
          <div>
            <strong>Stock Advisor</strong>
            <small>Explainable AI Console</small>
          </div>
        </div>

        <div className="status-card">
          <div className={`connection-dot ${apiStatus}`}></div>
          <div>
            <strong>
              {apiStatus === 'online'
                ? '모델 서버 연결됨'
                : apiStatus === 'checking'
                  ? '모델 서버 확인 중'
                  : '캐시 모드'}
            </strong>
            <span>{sourceLabel}</span>
          </div>
        </div>

        <label className="field">
          <span>분석 종목</span>
          <select
            onChange={(event) => setSelectedSymbol(event.target.value)}
            value={selectedSymbol}
          >
            {symbols.map((item) => (
              <option key={item.symbol} value={item.symbol}>
                {item.symbol} · {item.sector}
              </option>
            ))}
          </select>
        </label>

        <label className="field">
          <span>기준일</span>
          <select
            onChange={(event) => setSelectedDate(event.target.value)}
            value={selectedDate}
          >
            {dateOptions.map((date) => (
              <option key={date} value={date}>
                {date}
              </option>
            ))}
          </select>
        </label>

        <button className="primary-action" disabled={isRunning} onClick={runPrediction}>
          <span className={isRunning ? 'spinner' : 'play-symbol'}></span>
          {isRunning ? '모델 추론 중' : '분석 실행'}
        </button>

        <button className="secondary-action" onClick={openCustomInput} type="button">
          직접 입력 예측
        </button>

        {errorMessage && <p className="error-line">{errorMessage}</p>}

        <div className="symbol-rank">
          <div className="section-title">
            <span>시연 후보</span>
            <small>{symbols.length} symbols</small>
          </div>
          <div className="rank-list">
            {symbols.slice(0, 12).map((item) => (
              <button
                className={item.symbol === selectedSymbol ? 'active' : ''}
                key={item.symbol}
                onClick={() => setSelectedSymbol(item.symbol)}
                type="button"
              >
                <span>
                  <strong>{item.symbol}</strong>
                  <small>{item.sector}</small>
                </span>
                <em>{item.latestDate}</em>
              </button>
            ))}
          </div>
        </div>
      </aside>

      <section className="workspace">
        <header className="workspace-header">
          <div>
            <p className="eyebrow">Live explainable inference</p>
            <h1>{displaySymbol} 투자 판단 리포트</h1>
          </div>
          <div className="header-actions">
            <span className="runtime-pill">{sourceLabel}</span>
            <span className="runtime-pill">
              {prediction?.elapsedMs ?? bootstrap.readyMs ?? 0}ms
            </span>
          </div>
        </header>

        <section className="summary-strip">
          <Kpi label="기준일" value={prediction?.date ?? selectedDate} />
          <Kpi
            label="현재 종가"
            value={`$${formatNumber(prediction?.adjClose ?? selectedSymbolInfo?.latestClose)}`}
          />
          <Kpi
            label="Test AUC"
            value={(activeMetric?.auc ?? 0).toFixed(3)}
            tone="info"
          />
          <Kpi
            label="Top10 평균 수익률"
            value={formatSignedPercent(activeMetric?.top10Return ?? 0)}
            tone={(activeMetric?.top10Return ?? 0) >= 0 ? 'positive' : 'negative'}
          />
        </section>

        <section className="prediction-frame">
          <div>
            <span>모델 입력</span>
            <strong>기준일 이전 {bootstrap.meta.seqLen}거래일</strong>
            <small>기준일 이후 가격은 입력에서 제외</small>
          </div>
          <div>
            <span>예측 대상</span>
            <strong>
              다음 {bootstrap.meta.horizon}거래일 수익률 {formatPercent(bootstrap.meta.returnThreshold)} 초과
            </strong>
            <small>미래 방향을 확률로 추정</small>
          </div>
          <div>
            <span>검증 표시</span>
            <strong>{hasActualResult ? '과거 기준일 사후 검증' : '미래값 미확정'}</strong>
            <small>
              {hasActualResult
                ? '실제 결과는 모델 입력이 아니라 정답 확인용'
                : '직접 입력 데이터는 정답값을 알 수 없음'}
            </small>
          </div>
        </section>

        <section className="analysis-grid">
          <div className="result-panel">
            <div className="result-heading">
              <div>
                <p className="eyebrow">Model decision</p>
                <h2>{modelDecision(prediction)}</h2>
              </div>
              <span className={`decision-badge ${decisionTone(prediction)}`}>
                {prediction?.predictedUp ? 'BUY WATCH' : 'WAIT'}
              </span>
            </div>

            <div className="result-body">
              <ProbabilityGauge prediction={prediction} />
              <div className="decision-copy">
                <strong>
                  기준일 당시 데이터로 본 다음 {bootstrap.meta.horizon}거래일 수익률이{' '}
                  {formatPercent(bootstrap.meta.returnThreshold)}를 초과할 확률은{' '}
                  {formatPercent(prediction?.probabilityUp ?? 0)}입니다.
                </strong>
                <p>
                  모델은 기준일 이후 가격을 보지 않고, 최근 가격/거래량/시장/업종
                  흐름만 feature로 변환해 판단합니다. 반대 확률은{' '}
                  {formatPercent(prediction?.probabilityDown ?? 0)}입니다.
                </p>
              </div>
            </div>

            <div className="validation-row">
              <Kpi
                label="사후 실제 수익률"
                value={
                  hasActualResult ? formatSignedPercent(prediction?.futureReturn ?? 0) : '실측 없음'
                }
                tone={
                  hasActualResult
                    ? (prediction?.futureReturn ?? 0) >= 0
                      ? 'positive'
                      : 'negative'
                    : 'info'
                }
              />
              <Kpi
                label="사후 검증"
                value={hasActualResult ? (matched ? '판단 일치' : '판단 불일치') : '미래값 없음'}
                tone={hasActualResult ? (matched ? 'positive' : 'negative') : 'info'}
              />
              <Kpi
                label="기준 확률"
                value={formatPercent(prediction?.selectedThreshold ?? 0.5, 0)}
              />
            </div>
          </div>

          <div className="chart-panel">
            <div className="section-title">
              <span>입력 구간 가격 흐름</span>
              <small>{bootstrap.meta.seqLen} trading days</small>
            </div>
            <PriceChart values={prediction?.priceSeries} />
            <div className="context-grid">
              <span>직전 하루 {formatSignedPercent(prediction?.context?.return_1d ?? 0)}</span>
              <span>최근 5거래일 {formatSignedPercent(prediction?.context?.return_5d ?? 0)}</span>
              <span>
                관찰 구간 전체 {formatSignedPercent(prediction?.context?.return_window ?? 0)}
              </span>
              <span>
                시장 흐름 {formatSignedPercent(prediction?.context?.market_return ?? 0)}
              </span>
            </div>
          </div>
        </section>

        <nav className="view-tabs">
          <button
            className={activeView === 'explain' ? 'active' : ''}
            onClick={() => setActiveView('explain')}
          >
            예측 근거
          </button>
          <button
            className={activeView === 'report' ? 'active' : ''}
            onClick={() => setActiveView('report')}
          >
            설명 리포트
          </button>
          <button
            className={activeView === 'performance' ? 'active' : ''}
            onClick={() => setActiveView('performance')}
          >
            성능 검증
          </button>
        </nav>

        {activeView === 'explain' && (
          <section className="detail-grid">
            <div className="panel">
              <div className="section-title">
                <span>개별 예측 기여도</span>
                <small>{prediction?.date ?? selectedDate} · 방향 중심 해석</small>
              </div>
              <div className="evidence-meta">
                <span>{prediction?.symbol ?? selectedSymbol}</span>
                <span>{prediction?.sector ?? selectedSector}</span>
                <span>{sourceLabel}</span>
              </div>
              <p className="panel-note">
                이 모델의 개별 기여도는 값의 크기보다 어느 방향으로 판단을 밀었는지가
                중요합니다. 막대 길이 대신 상승/관망 방향과 지표 의미를 보여줍니다.
              </p>
              <div className="contribution-table">
                {contributionItems.map((item, index) => (
                  <div
                    className={`contribution-row ${item.direction.tone}`}
                    key={`${prediction?.symbol}-${prediction?.date}-${item.name}-${index}`}
                  >
                    <span className="rank-mark">{item.rank}</span>
                    <div className="contribution-copy">
                      <strong>{item.displayLabel}</strong>
                      <small>
                        {item.category.name} · {item.direction.sentence}
                      </small>
                    </div>
                    <em>{item.direction.label}</em>
                  </div>
                ))}
              </div>
            </div>

            <div className="panel">
              <div className="section-title">
                <span>모델이 자주 본 정보</span>
                <small>전역 중요도</small>
              </div>
              <p className="panel-note">
                전체 학습/검증 구간에서 모델이 상대적으로 자주 참고한 정보입니다. 숫자
                자체보다 어떤 종류의 정보를 보는 모델인지 확인하는 용도입니다.
              </p>
              <div className="feature-list">
                {featureItems.map((item) => (
                  <div className="feature-row" key={item.feature ?? item.label}>
                    <span className="rank-mark">{item.rank}</span>
                    <div className="feature-copy">
                      <strong>{item.displayLabel}</strong>
                      <small>{item.category.description}</small>
                    </div>
                    <div className="feature-meter" aria-hidden="true">
                      <i style={{ width: `${item.relativeImportance}%` }}></i>
                    </div>
                    <em>{item.relativeImportance}%</em>
                  </div>
                ))}
              </div>
            </div>
          </section>
        )}

        {activeView === 'report' && (
          <section className="panel report-panel">
            <div className="section-title">
              <span>자연어 설명</span>
              <small>사용자용 요약</small>
            </div>
            <div className="report-copy">
              {plainReport.map((section) => (
                <article className="report-section" key={section.title}>
                  <h3>{section.title}</h3>
                  <p>{section.body}</p>
                </article>
              ))}
            </div>
          </section>
        )}

        {activeView === 'performance' && (
          <section className="detail-grid">
            <div className="panel">
              <div className="section-title">
                <span>Split별 평가</span>
                <small>results_summary.csv</small>
              </div>
              <div className="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>Split</th>
                      <th>Accuracy</th>
                      <th>AUC</th>
                      <th>Majority</th>
                      <th>Top10 precision</th>
                      <th>Top10 return</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(bootstrap.metrics ?? []).map((row) => (
                      <tr key={row.split}>
                        <td>{row.split}</td>
                        <td>{formatPercent(row.accuracy)}</td>
                        <td>{(row.auc ?? 0).toFixed(3)}</td>
                        <td>{formatPercent(row.majorityBaseline)}</td>
                        <td>{formatPercent(row.top10Precision)}</td>
                        <td>{formatSignedPercent(row.top10Return)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="panel">
              <div className="section-title">
                <span>백테스트</span>
                <small>backtest_summary.csv</small>
              </div>
              <div className="backtest-list">
                {(bootstrap.backtest ?? []).map((row) => (
                  <div className="backtest-row" key={row.strategy}>
                    <strong>{row.strategy}</strong>
                    <span>평균 {formatSignedPercent(row.meanPeriodReturn)}</span>
                    <span>누적 {formatSignedPercent(row.cumulativeReturn, 1)}</span>
                    <span>Sharpe {formatNumber(row.sharpe)}</span>
                  </div>
                ))}
              </div>
            </div>
          </section>
        )}
      </section>

      {isCustomOpen && (
        <div className="modal-backdrop" onMouseDown={() => setIsCustomOpen(false)}>
          <section
            aria-labelledby="custom-input-title"
            aria-modal="true"
            className="input-modal"
            onMouseDown={(event) => event.stopPropagation()}
            role="dialog"
          >
            <div className="modal-header">
              <div>
                <p className="eyebrow">Custom inference</p>
                <h2 id="custom-input-title">종목 정보 직접 입력</h2>
              </div>
              <button
                aria-label="닫기"
                className="icon-button"
                onClick={() => setIsCustomOpen(false)}
                type="button"
              >
                ×
              </button>
            </div>

            <div className="custom-form-grid">
              <label className="light-field">
                <span>종목 코드</span>
                <input
                  onChange={(event) => setCustomSymbol(event.target.value.toUpperCase())}
                  placeholder="예: NVDA"
                  value={customSymbol}
                />
              </label>

              <label className="light-field">
                <span>섹터</span>
                <input
                  onChange={(event) => setCustomSector(event.target.value)}
                  placeholder="예: Technology"
                  value={customSector}
                />
              </label>
            </div>

            <label className="light-field">
              <span>가격 CSV</span>
              <textarea
                className="custom-textarea"
                onChange={(event) => setCustomCsv(event.target.value)}
                placeholder="Date,Open,High,Low,Close,Adj Close,Volume,market_return"
                spellCheck="false"
                value={customCsv}
              />
            </label>

            <div className="input-requirements">
              Date와 Close 또는 Adj Close는 필수입니다. ma50 계산과 모델 입력 window 때문에
              최소 {Number(bootstrap.meta.seqLen ?? 30) + 49}개 행이 필요합니다.
            </div>

            {customMessage && <p className="custom-message">{customMessage}</p>}

            <div className="custom-actions">
              <button
                className="ghost-action"
                disabled={isCustomLoading}
                onClick={fillSyntheticData}
                type="button"
              >
                테스트 데이터 채우기
              </button>
              <button
                className="ghost-action"
                disabled={isCustomLoading || apiStatus !== 'online'}
                onClick={loadSampleCsv}
                type="button"
              >
                입력 종목 샘플 불러오기
              </button>
              <button
                className="primary-action"
                disabled={isCustomLoading || apiStatus !== 'online' || !customCsv.trim()}
                onClick={runCustomPrediction}
                type="button"
              >
                <span className={isCustomLoading ? 'spinner' : 'play-symbol'}></span>
                {isCustomLoading ? '예측 중' : '이 데이터로 예측'}
              </button>
            </div>
          </section>
        </div>
      )}
    </main>
  )
}

export default App
