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

const action = require('../src/dx-excshell-1/actions/download-file/index.js')

const authHeaders = { __ow_headers: { authorization: 'Bearer fake' } }

beforeEach(() => {
  jest.clearAllMocks()
  Core.Logger.mockReturnValue(mockLoggerInstance)
})

describe('download-file', () => {
  test('main is a function', () => {
    expect(action.main).toBeInstanceOf(Function)
  })

  test('returns 400 when fileName/header is missing', async () => {
    const res = await action.main({})
    expect(res.error.statusCode).toBe(400)
    expect(res.error.body.error).toEqual(expect.stringContaining('missing'))
  })

  test('returns 200 with a presigned URL', async () => {
    const generatePresignURL = jest.fn().mockResolvedValue('https://signed.example/hello.txt')
    Files.init.mockResolvedValue({ generatePresignURL })
    const res = await action.main({ ...authHeaders, fileName: 'hello.txt' })
    expect(res.statusCode).toBe(200)
    expect(res.body).toEqual({ url: 'https://signed.example/hello.txt', fileName: 'hello.txt' })
    expect(generatePresignURL).toHaveBeenCalledWith('hello.txt', { expiryInSeconds: 120, permissions: 'r' })
  })

  test('returns 500 when the Files SDK throws', async () => {
    Files.init.mockRejectedValue(new Error('sdk down'))
    const res = await action.main({ ...authHeaders, fileName: 'hello.txt' })
    expect(res).toEqual({ error: { statusCode: 500, body: { error: 'server error' } } })
  })
})
