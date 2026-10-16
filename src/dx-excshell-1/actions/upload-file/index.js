/*
* <license header>
*/

/**
 * Uploads a file (sent as a base64-encoded string) into the application's
 * Adobe I/O Files store.
 *
 * Note: Adobe I/O Runtime caps the request payload at ~1 MB, so this action is
 * intended for small files. For large uploads, presign a write URL and upload
 * directly from the browser instead.
 */

const { Core, Files } = require('@adobe/aio-sdk')
const { errorResponse, stringParameters, checkMissingRequestInputs } = require('../utils')

/**
 * Strips leading slashes and rejects path traversal from a user-supplied name.
 *
 * @param {string} name the requested file name
 * @returns {string|null} the sanitized name, or null if invalid
 */
function sanitizeFileName (name) {
  const trimmed = String(name).replace(/^\/+/, '').trim()
  if (!trimmed || trimmed.split('/').some((seg) => seg === '..')) {
    return null
  }
  return trimmed
}

// main function that will be executed by Adobe I/O Runtime
async function main (params) {
  // create a Logger
  const logger = Core.Logger('main', { level: params.LOG_LEVEL || 'info' })

  try {
    logger.info('Calling the upload-file action')
    logger.debug(stringParameters(params))

    // check for missing request input parameters and headers
    const requiredParams = ['fileName', 'content']
    const requiredHeaders = []
    const errorMessage = checkMissingRequestInputs(params, requiredParams, requiredHeaders)
    if (errorMessage) {
      return errorResponse(400, errorMessage, logger)
    }

    const fileName = sanitizeFileName(params.fileName)
    if (!fileName) {
      return errorResponse(400, 'invalid fileName', logger)
    }

    // init the Files SDK and write the decoded content
    const files = await Files.init()
    await files.write(fileName, Buffer.from(params.content, 'base64'))

    const response = {
      statusCode: 200,
      body: { message: `file '${fileName}' uploaded`, fileName }
    }

    logger.info(`${response.statusCode}: uploaded ${fileName}`)
    return response
  } catch (error) {
    logger.error(error)
    return errorResponse(500, 'server error', logger)
  }
}

exports.main = main
