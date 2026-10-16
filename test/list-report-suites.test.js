/*
* <license header>
*/

const { Core } = require('@adobe/aio-sdk')

jest.mock('@adobe/aio-sdk', () => ({ Core: { Logger: jest.fn() } }))
jest.mock('../src/dx-excshell-1/actions/lib/analytics', () => ({ initAnalytics: jest.fn() }))

const { initAnalytics } = require('../src/dx-excshell-1/actions/lib/analytics')

const mockLoggerInstance = { info: jest.fn(), debug: jest.fn(), error: jest.fn() }
Core.Logger.mockReturnValue(mockLoggerInstance)

const action = require('../src/dx-excshell-1/actions/list-report-suites/index.js')

beforeEach(() => {
  jest.clearAllMocks()
  Core.Logger.mockReturnValue(mockLoggerInstance)
})

describe('list-report-suites', () => {
  test('main is a function', () => {
    expect(action.main).toBeInstanceOf(Function)
  })

  test('returns 400 when apiKey is missing', async () => {
    const res = await action.main({})
    expect(res.error.statusCode).toBe(400)
    expect(res.error.body.error).toEqual(expect.stringContaining('apiKey'))
  })

  test('returns 200 with mapped report suites', async () => {
    initAnalytics.mockResolvedValue({
      client: {
        getCollections: jest.fn().mockResolvedValue({
          body: { content: [{ rsid: 'rs1', name: 'Suite One', extra: 'ignored' }] }
        })
      }
    })
    const res = await action.main({ apiKey: 'key' })
    expect(res.statusCode).toBe(200)
    expect(res.body.suites).toEqual([{ rsid: 'rs1', name: 'Suite One' }])
  })

  test('returns 500 when the Analytics SDK throws', async () => {
    initAnalytics.mockRejectedValue(new Error('boom'))
    const res = await action.main({ apiKey: 'key' })
    expect(res).toEqual({ error: { statusCode: 500, body: { error: 'server error' } } })
  })
})
