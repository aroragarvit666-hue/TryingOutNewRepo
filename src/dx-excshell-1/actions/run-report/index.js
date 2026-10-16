/*
* <license header>
*/

/**
 * Runs an Adobe Analytics report for a given report suite over the last N days,
 * returning daily Page Views / Visits / Visitors.
 */

const { Core } = require('@adobe/aio-sdk')
const { errorResponse, stringParameters, checkMissingRequestInputs } = require('../utils')
const { initAnalytics } = require('../lib/analytics')

// metrics requested, in column order
const METRICS = [
  { columnId: '0', id: 'metrics/pageviews', label: 'Page Views' },
  { columnId: '1', id: 'metrics/visits', label: 'Visits' },
  { columnId: '2', id: 'metrics/visitors', label: 'Visitors' }
]

// formats a Date as the Analytics API expects: 2026-07-01T00:00:00.000
function fmt (d) {
  return d.toISOString().slice(0, 23)
}

// builds an inclusive-of-today date range string for the last `days` days
function buildDateRange (days) {
  const now = new Date()
  const end = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1))
  const start = new Date(end)
  start.setUTCDate(start.getUTCDate() - days)
  return `${fmt(start)}/${fmt(end)}`
}

async function main (params) {
  const logger = Core.Logger('main', { level: params.LOG_LEVEL || 'info' })

  try {
    logger.info('Calling the run-report action')
    logger.debug(stringParameters(params))

    const requiredParams = ['apiKey', 'rsid', 'days']
    const requiredHeaders = []
    const errorMessage = checkMissingRequestInputs(params, requiredParams, requiredHeaders)
    if (errorMessage) {
      return errorResponse(400, errorMessage, logger)
    }

    const days = parseInt(params.days, 10)
    if (!Number.isInteger(days) || days <= 0) {
      return errorResponse(400, 'days must be a positive integer', logger)
    }

    const { client } = await initAnalytics(params)

    const dateRange = buildDateRange(days)
    const reportBody = {
      rsid: params.rsid,
      globalFilters: [{ type: 'dateRange', dateRange }],
      metricContainer: { metrics: METRICS.map(({ columnId, id }) => ({ columnId, id })) },
      dimension: 'variables/daterangeday',
      settings: { limit: 400, page: 0 }
    }

    const res = await client.getReport(reportBody)
    const report = (res && res.body) || {}

    const columns = METRICS.map((m) => m.label)
    const rows = (report.rows || []).map((r) => ({ label: r.value, values: r.data || [] }))
    const totals = columns.map((_, i) => rows.reduce((sum, r) => sum + (Number(r.values[i]) || 0), 0))

    logger.info(`200: report for ${params.rsid} returned ${rows.length} row(s)`)
    return { statusCode: 200, body: { report: { columns, rows, totals, dateRange } } }
  } catch (error) {
    logger.error(error)
    // surface Analytics SDK error codes where available (403 = no access, 404 = bad rsid, etc.)
    const code = error && error.code ? ` (${error.code})` : ''
    return errorResponse(500, `server error${code}`, logger)
  }
}

exports.main = main
