/*
* <license header>
*/

/**
 * Generates a short-lived, read-only presigned URL for a file in the
 * application's Adobe I/O Files store so the browser can download it directly
 * (bypassing the ~1 MB action response limit).
 */

const { Core, Files } = require('@adobe/aio-sdk')
const { errorResponse, stringParameters, checkMissingRequestInputs } = require('../utils')

// main function that will be executed by Adobe I/O Runtime
async function main (params) {
  // create a Logger
  const logger = Core.Logger('main', { level: params.LOG_LEVEL || 'info' })

  try {
    logger.info('Calling the download-file action')
    logger.debug(stringParameters(params))

    // check for missing request input parameters and headers
    const requiredParams = ['fileName']
    const requiredHeaders = []
    const errorMessage = checkMissingRequestInputs(params, requiredParams, requiredHeaders)
    if (errorMessage) {
      return errorResponse(400, errorMessage, logger)
    }

    const fileName = String(params.fileName).replace(/^\/+/, '')

    // init the Files SDK and generate a presigned read URL
    const files = await Files.init()
    const url = await files.generatePresignURL(fileName, { expiryInSeconds: 120, permissions: 'r' })

    const response = {
      statusCode: 200,
      body: { url, fileName }
    }

    logger.info(`${response.statusCode}: presigned ${fileName}`)
    return response
  } catch (error) {
    logger.error(error)
    return errorResponse(500, 'server error', logger)
  }
}

exports.main = main
