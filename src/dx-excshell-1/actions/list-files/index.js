/*
* <license header>
*/

/**
 * Lists the files currently stored in the application's Adobe I/O Files store.
 */

const { Core, Files } = require('@adobe/aio-sdk')
const { errorResponse, stringParameters, checkMissingRequestInputs } = require('../utils')

// main function that will be executed by Adobe I/O Runtime
async function main (params) {
  // create a Logger
  const logger = Core.Logger('main', { level: params.LOG_LEVEL || 'info' })

  try {
    logger.info('Calling the list-files action')
    logger.debug(stringParameters(params))

    // check for missing request input parameters and headers
    const requiredParams = []
    const requiredHeaders = []
    const errorMessage = checkMissingRequestInputs(params, requiredParams, requiredHeaders)
    if (errorMessage) {
      return errorResponse(400, errorMessage, logger)
    }

    // init the Files SDK (uses the namespace credentials on Adobe I/O Runtime)
    const files = await Files.init()

    // list all entries in the store; aio-lib-files returns property objects
    // (older versions returned plain path strings, so handle both)
    const entries = await files.list('/')

    const list = (entries || [])
      .map((entry) => (typeof entry === 'string' ? { name: entry } : entry))
      // only report actual files, skip directories / directory markers
      .filter((e) => e && e.name && !e.isDirectory && !e.name.endsWith('/'))
      .map((e) => ({
        name: e.name,
        contentLength: e.contentLength,
        lastModified: e.lastModified,
        contentType: e.contentType
      }))

    const response = {
      statusCode: 200,
      body: { files: list }
    }

    logger.info(`${response.statusCode}: listed ${list.length} file(s)`)
    return response
  } catch (error) {
    logger.error(error)
    return errorResponse(500, 'server error', logger)
  }
}

exports.main = main
