/*
* <license header>
*/

const { Core, Files } = require('@adobe/aio-sdk')

jest.mock('@adobe/aio-sdk', () => ({
  Core: { Logger: jest.fn() },
  Files: { init: jest.fn() }
}))

const mockLoggerInstance = { info: jest.fn(), debug: jest.fn(), error: jest.fn() }
Core.Logger.mockReturnValue(mockLoggerInstance)

const action = require('../src/dx-excshell-1/actions/upload-file/index.js')

const authHeaders = { __ow_headers: { authorization: 'Bearer fake' } }
const base64 = Buffer.from('hello').toString('base64')

beforeEach(() => {
  jest.clearAllMocks()
  Core.Logger.mockReturnValue(mockLoggerInstance)
})

describe('upload-file', () => {
  test('main is a function', () => {
    expect(action.main).toBeInstanceOf(Function)
  })

  test('returns 400 when required params/headers are missing', async () => {
    const res = await action.main({})
    expect(res.error.statusCode).toBe(400)
    expect(res.error.body.error).toEqual(expect.stringContaining('missing'))
  })

  test('returns 400 for an invalid (traversal) fileName', async () => {
    const res = await action.main({ ...authHeaders, fileName: '../secret.txt', content: base64 })
    expect(res).toEqual({ error: { statusCode: 400, body: { error: 'invalid fileName' } } })
  })

  test('returns 200 and writes the decoded content', async () => {
    const write = jest.fn().mockResolvedValue(undefined)
    Files.init.mockResolvedValue({ write })
    const res = await action.main({ ...authHeaders, fileName: 'hello.txt', content: base64 })
    expect(res.statusCode).toBe(200)
    expect(res.body.fileName).toBe('hello.txt')
    expect(write).toHaveBeenCalledWith('hello.txt', Buffer.from('hello'))
  })

  test('returns 500 when the Files SDK throws', async () => {
    Files.init.mockRejectedValue(new Error('sdk down'))
    const res = await action.main({ ...authHeaders, fileName: 'hello.txt', content: base64 })
    expect(res).toEqual({ error: { statusCode: 500, body: { error: 'server error' } } })
  })
})
