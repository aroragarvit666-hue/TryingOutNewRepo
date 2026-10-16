/*
* <license header>
*/

const { Core } = require('@adobe/aio-sdk')

jest.mock('@adobe/aio-sdk', () => ({ Core: { Logger: jest.fn() } }))
jest.mock('../src/dx-excshell-1/actions/lib/analytics', () => ({ initAnalytics: jest.fn() }))

const { initAnalytics } = require('../src/dx-excshell-1/actions/lib/analytics')

const mockLoggerInstance = { info: jest.fn(), debug: jest.fn(), error: jest.fn() }
Core.Logger.mockReturnValue(mockLoggerInstance)

const action = require('../src/dx-excshell-1/actions/run-report/index.js')

const baseParams = { apiKey: 'key', rsid: 'rs1', days: '30' }

beforeEach(() => {
  jest.clearAllMocks()
  Core.Logger.mockReturnValue(mockLoggerInstance)
})

describe('run-report', () => {
  test('main is a function', () => {
    expect(action.main).toBeInstanceOf(Function)
  })

  test('returns 400 when required params are missing', async () => {
    const res = await action.main({ apiKey: 'key' })
    expect(res.error.statusCode).toBe(400)
    expect(res.error.body.error).toEqual(expect.stringContaining('missing'))
  })

  test('returns 400 for a non-positive days value', async () => {
    const res = await action.main({ ...baseParams, days: '0' })
    expect(res).toEqual({ error: { statusCode: 400, body: { error: 'days must be a positive integer' } } })
  })

  test('returns 200 with a shaped report (columns, rows, totals)', async () => {
    const getReport = jest.fn().mockResolvedValue({
      body: {
        rows: [
          { value: 'Jul 1', data: [10, 4, 3] },
          { value: 'Jul 2', data: [20, 6, 5] }
        ]
      }
    })
    initAnalytics.mockResolvedValue({ client: { getReport } })

    const res = await action.main(baseParams)
    expect(res.statusCode).toBe(200)
    expect(res.body.report.columns).toEqual(['Page Views', 'Visits', 'Visitors'])
    expect(res.body.report.rows).toEqual([
      { label: 'Jul 1', values: [10, 4, 3] },
      { label: 'Jul 2', values: [20, 6, 5] }
    ])
    expect(res.body.report.totals).toEqual([30, 10, 8])
    // the report body sent to the SDK targets the right suite + dimension
    const sentBody = getReport.mock.calls[0][0]
    expect(sentBody.rsid).toBe('rs1')
    expect(sentBody.dimension).toBe('variables/daterangeday')
    expect(sentBody.globalFilters[0].dateRange).toMatch(/^\d{4}-\d{2}-\d{2}T.*\/\d{4}-\d{2}-\d{2}T/)
  })

  test('returns 500 when the Analytics SDK throws', async () => {
    initAnalytics.mockRejectedValue(new Error('boom'))
    const res = await action.main(baseParams)
    expect(res.error.statusCode).toBe(500)
    expect(res.error.body.error).toEqual(expect.stringContaining('server error'))
  })
})
