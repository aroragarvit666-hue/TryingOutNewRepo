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

const action = require('../src/dx-excshell-1/actions/list-files/index.js')

const authHeaders = { __ow_headers: { authorization: 'Bearer fake' } }

beforeEach(() => {
  jest.clearAllMocks()
  Core.Logger.mockReturnValue(mockLoggerInstance)
})

describe('list-files', () => {
  test('main is a function', () => {
    expect(action.main).toBeInstanceOf(Function)
  })

  test('returns 200 with the list of files (filtering out directories)', async () => {
    Files.init.mockResolvedValue({
      list: jest.fn().mockResolvedValue([
        { name: 'hello.txt', contentLength: 5, lastModified: 'now', contentType: 'text/plain', isDirectory: false },
        { name: 'sub/', isDirectory: true }
      ])
    })
    const res = await action.main(authHeaders)
    expect(res.statusCode).toBe(200)
    expect(res.body.files).toEqual([
      { name: 'hello.txt', contentLength: 5, lastModified: 'now', contentType: 'text/plain' }
    ])
  })

  test('returns 500 when the Files SDK throws', async () => {
    Files.init.mockRejectedValue(new Error('sdk down'))
    const res = await action.main(authHeaders)
    expect(res).toEqual({ error: { statusCode: 500, body: { error: 'server error' } } })
  })
})
