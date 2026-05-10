'use client'

import { motion } from 'motion/react'
import { type CSSProperties } from 'react'

/* ═══════════════════════════════════════════
   Donut / Ring Chart
   ═══════════════════════════════════════════ */

interface DonutSegment {
  value: number
  color: string
  label: string
}

interface DonutChartProps {
  segments: DonutSegment[]
  size?: number
  strokeWidth?: number
  className?: string
  centerLabel?: string
  centerValue?: string | number
}

export function DonutChart({
  segments,
  size = 180,
  strokeWidth = 22,
  className = '',
  centerLabel,
  centerValue,
}: DonutChartProps) {
  const radius = (size - strokeWidth) / 2
  const circumference = 2 * Math.PI * radius
  const total = segments.reduce((sum, s) => sum + s.value, 0)

  // Only round the caps when one segment covers the full ring. With multiple
  // visible segments the round caps bleed past each segment boundary into
  // the neighbouring colour, producing a phantom sliver at every join.
  const visibleSegmentCount = segments.reduce(
    (count, seg) => (seg.value > 0 ? count + 1 : count),
    0,
  )
  const useRoundCap = visibleSegmentCount <= 1

  let accumulated = 0

  return (
    <div className={className} style={{ position: 'relative', width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        {/* Background track */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="var(--border)"
          strokeWidth={strokeWidth}
          opacity={0.5}
        />
        {total > 0 &&
          segments.map((seg, i) => {
            // Skip zero-value segments entirely. Round line caps would
            // otherwise render a small dot at the segment's start position,
            // making it look like the category still has a slice on the ring.
            if (seg.value <= 0) {
              return null
            }

            const segLen = (seg.value / total) * circumference
            const offset = (accumulated / total) * circumference
            accumulated += seg.value

            return (
              <motion.circle
                key={i}
                cx={size / 2}
                cy={size / 2}
                r={radius}
                fill="none"
                stroke={seg.color}
                strokeWidth={strokeWidth}
                strokeLinecap={useRoundCap ? 'round' : 'butt'}
                strokeDasharray={`${segLen} ${circumference - segLen}`}
                strokeDashoffset={-offset}
                style={{ transformOrigin: 'center', transform: 'rotate(-90deg)' }}
                initial={{ strokeDasharray: `0 ${circumference}` }}
                animate={{ strokeDasharray: `${segLen} ${circumference - segLen}` }}
                transition={{ duration: 0.8, delay: i * 0.15, ease: [0.16, 1, 0.3, 1] }}
              />
            )
          })}
      </svg>
      {(centerLabel || centerValue !== undefined) && (
        <div
          style={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          {centerValue !== undefined && (
            <motion.span
              style={{
                fontFamily: 'var(--font-display)',
                fontWeight: 700,
                fontSize: size * 0.17,
                color: 'var(--text-primary)',
                lineHeight: 1.1,
              }}
              initial={{ opacity: 0, scale: 0.7 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.5, delay: 0.3 }}
            >
              {centerValue}
            </motion.span>
          )}
          {centerLabel && (
            <span
              style={{
                fontSize: size * 0.065,
                color: 'var(--text-tertiary)',
                fontWeight: 600,
                textTransform: 'uppercase',
                letterSpacing: '0.12em',
                marginTop: 2,
              }}
            >
              {centerLabel}
            </span>
          )}
        </div>
      )}
    </div>
  )
}

/* ═══════════════════════════════════════════
   Progress Ring (single value 0-100)
   ═══════════════════════════════════════════ */

interface ProgressRingProps {
  value: number
  max?: number
  size?: number
  strokeWidth?: number
  color?: string
  trackColor?: string
  className?: string
  label?: string
  suffix?: string
}

export function ProgressRing({
  value,
  max = 100,
  size = 100,
  strokeWidth = 10,
  color = 'var(--marketing-accent)',
  trackColor = 'var(--border)',
  className = '',
  label,
  suffix = '%',
}: ProgressRingProps) {
  const radius = (size - strokeWidth) / 2
  const circumference = 2 * Math.PI * radius
  const pct = Math.min(value / max, 1)
  const dashLen = pct * circumference

  return (
    <div className={className} style={{ position: 'relative', width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={trackColor}
          strokeWidth={strokeWidth}
          opacity={0.45}
        />
        <motion.circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={`${dashLen} ${circumference - dashLen}`}
          style={{ transformOrigin: 'center', transform: 'rotate(-90deg)' }}
          initial={{ strokeDasharray: `0 ${circumference}` }}
          animate={{ strokeDasharray: `${dashLen} ${circumference - dashLen}` }}
          transition={{ duration: 1, ease: [0.16, 1, 0.3, 1] }}
        />
      </svg>
      <div
        style={{
          position: 'absolute',
          inset: 0,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <motion.span
          style={{
            fontFamily: 'var(--font-display)',
            fontWeight: 700,
            fontSize: size * 0.22,
            color: 'var(--text-primary)',
            lineHeight: 1,
          }}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.4 }}
        >
          {Math.round(value)}{suffix}
        </motion.span>
        {label && (
          <span
            style={{
              fontSize: size * 0.1,
              color: 'var(--text-tertiary)',
              fontWeight: 600,
              textTransform: 'uppercase',
              letterSpacing: '0.12em',
              marginTop: 2,
            }}
          >
            {label}
          </span>
        )}
      </div>
    </div>
  )
}

/* ═══════════════════════════════════════════
   Horizontal Bar Chart
   ═══════════════════════════════════════════ */

interface BarDatum {
  label: string
  value: number
  color: string
}

interface BarChartProps {
  data: BarDatum[]
  className?: string
}

export function HorizontalBarChart({ data, className = '' }: BarChartProps) {
  const maxVal = Math.max(...data.map((d) => d.value), 1)

  return (
    <div className={className} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      {data.map((d, i) => (
        <div key={i}>
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'baseline',
              marginBottom: 6,
            }}
          >
            <span
              style={{
                fontSize: 13,
                fontWeight: 600,
                color: 'var(--text-primary)',
              }}
            >
              {d.label}
            </span>
            <span
              style={{
                fontSize: 13,
                fontWeight: 700,
                fontFamily: 'var(--font-mono)',
                color: 'var(--text-secondary)',
              }}
            >
              {d.value}
            </span>
          </div>
          <div
            style={{
              height: 8,
              borderRadius: 9999,
              background: 'var(--border)',
              overflow: 'hidden',
            }}
          >
            <motion.div
              style={{
                height: '100%',
                borderRadius: 9999,
                background: d.color,
              }}
              initial={{ width: 0 }}
              animate={{ width: `${(d.value / maxVal) * 100}%` }}
              transition={{ duration: 0.7, delay: i * 0.1, ease: [0.16, 1, 0.3, 1] }}
            />
          </div>
        </div>
      ))}
    </div>
  )
}

/* ═══════════════════════════════════════════
   Sparkline (mini line chart)
   ═══════════════════════════════════════════ */

interface SparkLineProps {
  data: number[]
  width?: number
  height?: number
  color?: string
  className?: string
  style?: CSSProperties
}

export function SparkLine({
  data,
  width = 200,
  height = 48,
  color = 'var(--marketing-accent)',
  className = '',
  style,
}: SparkLineProps) {
  if (data.length < 2) return null

  const padding = 2
  const minVal = Math.min(...data)
  const maxVal = Math.max(...data)
  const range = maxVal - minVal || 1

  const points = data
    .map((v, i) => {
      const x = padding + (i / (data.length - 1)) * (width - padding * 2)
      const y = height - padding - ((v - minVal) / range) * (height - padding * 2)
      return `${x},${y}`
    })
    .join(' ')

  const areaPoints = `${padding},${height - padding} ${points} ${width - padding},${height - padding}`

  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      className={className}
      style={style}
    >
      <defs>
        <linearGradient id="sparkFill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity={0.25} />
          <stop offset="100%" stopColor={color} stopOpacity={0} />
        </linearGradient>
      </defs>
      <motion.polygon
        points={areaPoints}
        fill="url(#sparkFill)"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.6 }}
      />
      <motion.polyline
        points={points}
        fill="none"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
        initial={{ pathLength: 0, opacity: 0 }}
        animate={{ pathLength: 1, opacity: 1 }}
        transition={{ duration: 1, ease: [0.16, 1, 0.3, 1] }}
      />
      {/* Endpoint dot */}
      {data.length > 0 && (() => {
        const lastX = padding + ((data.length - 1) / (data.length - 1)) * (width - padding * 2)
        const lastY = height - padding - ((data[data.length - 1] - minVal) / range) * (height - padding * 2)
        return (
          <motion.circle
            cx={lastX}
            cy={lastY}
            r={3.5}
            fill={color}
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ duration: 0.3, delay: 0.8, type: 'spring', stiffness: 400 }}
          />
        )
      })()}
    </svg>
  )
}

/* ═══════════════════════════════════════════
   Vertical Bar Chart
   ═══════════════════════════════════════════ */

interface VertBarDatum {
  label: string
  value: number
  color: string
}

interface VertBarChartProps {
  data: VertBarDatum[]
  height?: number
  className?: string
}

export function VerticalBarChart({ data, height = 150, className = '' }: VertBarChartProps) {
  const maxVal = Math.max(...data.map((d) => d.value), 1)

  return (
    <div className={className}>
      <div
        style={{
          display: 'flex',
          alignItems: 'flex-end',
          gap: 8,
          height,
          padding: '0 4px',
        }}
      >
        {data.map((d, i) => {
          const barH = (d.value / maxVal) * (height - 24)
          return (
            <div
              key={i}
              style={{
                flex: 1,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: 6,
              }}
            >
              <span
                style={{
                  fontSize: 11,
                  fontWeight: 700,
                  fontFamily: 'var(--font-mono)',
                  color: 'var(--text-secondary)',
                }}
              >
                {d.value}
              </span>
              <motion.div
                style={{
                  width: '100%',
                  maxWidth: 36,
                  borderRadius: '6px 6px 2px 2px',
                  background: d.color,
                }}
                initial={{ height: 0 }}
                animate={{ height: barH }}
                transition={{ duration: 0.6, delay: i * 0.1, ease: [0.16, 1, 0.3, 1] }}
              />
            </div>
          )
        })}
      </div>
      <div
        style={{
          display: 'flex',
          gap: 8,
          padding: '8px 4px 0',
          borderTop: '1px solid var(--border)',
          marginTop: 6,
        }}
      >
        {data.map((d, i) => (
          <span
            key={i}
            style={{
              flex: 1,
              textAlign: 'center',
              fontSize: 11,
              fontWeight: 600,
              color: 'var(--text-tertiary)',
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
            }}
          >
            {d.label}
          </span>
        ))}
      </div>
    </div>
  )
}

/* ═══════════════════════════════════════════
   Stat Ticker – animated counter
   ═══════════════════════════════════════════ */

interface StatTickerProps {
  value: number
  className?: string
  style?: CSSProperties
}

export function StatTicker({ value, className = '', style }: StatTickerProps) {
  return (
    <motion.span
      className={className}
      style={style}
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
    >
      {value.toLocaleString()}
    </motion.span>
  )
}
