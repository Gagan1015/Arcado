'use client'

/**
 * Airtable-inspired table primitive shared across every admin table.
 *
 * Visual language:
 *   - A leading row-number column.
 *   - Column headers with a small type-icon preceding the label.
 *   - Vertical dividers between cells (right border on every cell except the
 *     last) and a flat top border so the table doesn't look like a card.
 *   - Category-type cells rendered as soft rounded pills via AdminTableChip.
 *   - Link cells styled as underlined monospace via AdminTableLink.
 *   - Row hover tint for pointer affordance.
 */

import Link, { type LinkProps } from 'next/link'
import {
  type ComponentType,
  type ReactNode,
  type SVGProps,
  type CSSProperties,
} from 'react'

type LucideIcon = ComponentType<SVGProps<SVGSVGElement>>

export interface AdminTableColumn<Row> {
  /** Stable identifier, also used as React key for the column. */
  key: string
  /** Visible column label. */
  label: string
  /** Tiny type icon rendered to the left of the label (like Airtable). */
  icon?: LucideIcon
  /** Render the cell body for a given row. */
  render: (row: Row, index: number) => ReactNode
  /**
   * Controls how much horizontal space this column takes. Accepts any CSS
   * width (e.g. "12rem", "minmax(8rem, 1.5fr)", "220px"). If omitted, the
   * column is flexible.
   */
  width?: string
  /** Horizontal alignment of the cell body. Defaults to 'left'. */
  align?: 'left' | 'center' | 'right'
  /** Inline style overrides for the cell. */
  cellClassName?: string
}

export interface AdminTableEmptyState {
  icon?: LucideIcon
  title: string
  description?: string
}

interface AdminTableProps<Row> {
  columns: AdminTableColumn<Row>[]
  rows: Row[]
  rowKey: (row: Row, index: number) => string
  /** Optional click handler — makes the whole row clickable. */
  onRowClick?: (row: Row, index: number) => void
  /**
   * Called per row to inject extra state (e.g. loading). The returned string
   * is appended to the row's className.
   */
  rowClassName?: (row: Row, index: number) => string | undefined
  /** What to show when `rows` is empty. */
  empty?: AdminTableEmptyState
  /** Footer content (Airtable shows an "Add row" row; we use it for summaries). */
  footer?: ReactNode
  /** Hide the leading row-number column if you don't want it. */
  hideRowNumbers?: boolean
}

export function AdminTable<Row>({
  columns,
  rows,
  rowKey,
  onRowClick,
  rowClassName,
  empty,
  footer,
  hideRowNumbers = false,
}: AdminTableProps<Row>) {
  const colCount = columns.length + (hideRowNumbers ? 0 : 1)
  const clickable = Boolean(onRowClick)

  return (
    <div className="admin-table-shell">
      <div className="admin-table-scroll">
        <table className="admin-table">
          <colgroup>
            {!hideRowNumbers && <col className="admin-table-col-index" />}
            {columns.map((column) => (
              <col
                key={column.key}
                style={column.width ? ({ width: column.width } as CSSProperties) : undefined}
              />
            ))}
          </colgroup>

          <thead>
            <tr>
              {!hideRowNumbers && (
                <th className="admin-table-th admin-table-th-index" aria-label="Row number" />
              )}
              {columns.map((column, colIndex) => {
                const Icon = column.icon
                return (
                  <th
                    key={column.key}
                    className={`admin-table-th admin-table-align-${column.align ?? 'left'} ${
                      colIndex === columns.length - 1 ? 'admin-table-th-last' : ''
                    }`}
                    scope="col"
                  >
                    <span className="admin-table-th-inner">
                      {Icon && <Icon className="admin-table-th-icon" aria-hidden="true" />}
                      <span>{column.label}</span>
                    </span>
                  </th>
                )
              })}
            </tr>
          </thead>

          <tbody>
            {rows.length > 0 ? (
              rows.map((row, index) => {
                const extra = rowClassName?.(row, index) ?? ''
                return (
                  <tr
                    key={rowKey(row, index)}
                    className={`admin-table-row ${clickable ? 'admin-table-row-clickable' : ''} ${extra}`}
                    onClick={clickable ? () => onRowClick?.(row, index) : undefined}
                  >
                    {!hideRowNumbers && (
                      <td className="admin-table-td admin-table-td-index">{index + 1}</td>
                    )}
                    {columns.map((column, colIndex) => (
                      <td
                        key={column.key}
                        className={`admin-table-td admin-table-align-${column.align ?? 'left'} ${
                          colIndex === columns.length - 1 ? 'admin-table-td-last' : ''
                        } ${column.cellClassName ?? ''}`}
                      >
                        {column.render(row, index)}
                      </td>
                    ))}
                  </tr>
                )
              })
            ) : (
              <tr className="admin-table-row">
                <td className="admin-table-empty" colSpan={colCount}>
                  <AdminTableEmpty {...(empty ?? { title: 'No records' })} />
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {footer && <div className="admin-table-footer">{footer}</div>}
    </div>
  )
}

function AdminTableEmpty({ icon: Icon, title, description }: AdminTableEmptyState) {
  return (
    <div className="flex flex-col items-center justify-center px-6 py-12 text-center">
      {Icon && <Icon className="mb-3 h-10 w-10 text-[var(--text-tertiary)]" />}
      <p className="text-sm font-medium text-[var(--text-secondary)]">{title}</p>
      {description && (
        <p className="mt-1 text-xs text-[var(--text-tertiary)]">{description}</p>
      )}
    </div>
  )
}

/* ══════════════════════════════════════════════════════════════════════════
   Cell helpers
   ══════════════════════════════════════════════════════════════════════════ */

interface AdminTableChipProps {
  children: ReactNode
  /** Accent color; falls back to a neutral surface chip. */
  color?: string
  className?: string
}

/** Soft rounded pill used for category / status / tag cells. */
export function AdminTableChip({ children, color, className = '' }: AdminTableChipProps) {
  const style: CSSProperties | undefined = color
    ? {
        backgroundColor: `color-mix(in srgb, ${color} 14%, transparent)`,
        color,
        borderColor: `color-mix(in srgb, ${color} 30%, transparent)`,
      }
    : undefined

  return (
    <span className={`admin-table-chip ${className}`} style={style}>
      {children}
    </span>
  )
}

interface AdminTableLinkProps extends LinkProps {
  children: ReactNode
  className?: string
  stopPropagation?: boolean
  external?: boolean
}

/** Underlined mono link styled like Airtable's URL cells. */
export function AdminTableLink({
  children,
  className = '',
  stopPropagation = true,
  external = false,
  ...linkProps
}: AdminTableLinkProps) {
  const classes = `admin-table-link ${className}`
  const handleClick = (event: React.MouseEvent<HTMLAnchorElement>) => {
    if (stopPropagation) {
      event.stopPropagation()
    }
  }

  if (external && typeof linkProps.href === 'string') {
    return (
      <a
        href={linkProps.href}
        target="_blank"
        rel="noreferrer noopener"
        className={classes}
        onClick={handleClick}
      >
        {children}
      </a>
    )
  }

  return (
    <Link {...linkProps} className={classes} onClick={handleClick}>
      {children}
    </Link>
  )
}
