/*
* <license header>
*/

/**
 * Lists the Adobe Analytics report suites available to the authenticated
 * integration, for populating a picker in the UI.
 */

const { Core } = require('@adobe/aio-sdk')
const { errorResponse, stringParameters, checkMissingRequestInputs } = require('../utils')
const { initAnalytics } = require('../lib/analytics')

async function main (params) {
  const logger = Core.Logger('main', { level: params.LOG_LEVEL || 'info' })

  try {
    logger.info('Calling the list-report-suites action')
    logger.debug(stringParameters(params))

    const requiredParams = ['apiKey']
    const requiredHeaders = []
    const errorMessage = checkMissingRequestInputs(params, requiredParams, requiredHeaders)
    if (errorMessage) {
      return errorResponse(400, errorMessage, logger)
    }

    const { client } = await initAnalytics(params)

    // getCollections lists the report suites
    const res = await client.getCollections({ limit: 100 })
    const content = (res && res.body && res.body.content) || []
    const suites = content.map((s) => ({ rsid: s.rsid, name: s.name }))

    logger.info(`200: listed ${suites.length} report suite(s)`)
    return { statusCode: 200, body: { suites } }
  } catch (error) {
    logger.error(error)
    return errorResponse(500, 'server error', logger)
  }
}

exports.main = main
