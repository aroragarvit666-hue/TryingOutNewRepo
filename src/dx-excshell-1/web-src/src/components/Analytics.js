/*
* <license header>
*/

import React, { useState, useEffect, useCallback } from 'react'
import PropTypes from 'prop-types'
import {
  View,
  Flex,
  Grid,
  Heading,
  Content,
  Picker,
  Item,
  Button,
  ProgressCircle,
  InlineAlert,
  IllustratedMessage,
  TableView,
  TableHeader,
  TableBody,
  Column,
  Row,
  Cell,
  Text,
  Divider
} from '@adobe/react-spectrum'
import Graph from '@spectrum-icons/workflow/GraphTrend'

import allActions from '../config.json'
import actionWebInvoke from '../utils'

const SUITES_URL = allActions['dx-excshell-1/list-report-suites']
const REPORT_URL = allActions['dx-excshell-1/run-report']
const actionsReady = Boolean(SUITES_URL && REPORT_URL)

const DATE_RANGES = [
  { id: '7', name: 'Last 7 days' },
  { id: '30', name: 'Last 30 days' },
  { id: '90', name: 'Last 90 days' }
]

function formatNumber (n) {
  const num = Number(n)
  return Number.isFinite(num) ? num.toLocaleString() : '—'
}

const Analytics = (props) => {
  const [suites, setSuites] = useState([])
  const [rsid, setRsid] = useState(null)
  const [days, setDays] = useState('30')
  const [report, setReport] = useState(null)
  const [isLoadingSuites, setIsLoadingSuites] = useState(false)
  const [isLoadingReport, setIsLoadingReport] = useState(false)
  const [error, setError] = useState(null)

  const authHeaders = useCallback(() => {
    const headers = {}
    if (props.ims.token) {
      headers.authorization = `Bearer ${props.ims.token}`
    }
    if (props.ims.org) {
      headers['x-gw-ims-org-id'] = props.ims.org
    }
    return headers
  }, [props.ims])

  // load the available report suites on mount
  useEffect(() => {
    if (!actionsReady) return
    let cancelled = false
    async function loadSuites () {
      setIsLoadingSuites(true)
      setError(null)
      try {
        const res = await actionWebInvoke(SUITES_URL, authHeaders(), {}, { method: 'GET' })
        if (!cancelled) setSuites((res && res.suites) || [])
      } catch (e) {
        console.error(e)
        if (!cancelled) setError(`Could not load report suites: ${e.message}`)
      } finally {
        if (!cancelled) setIsLoadingSuites(false)
      }
    }
    loadSuites()
    return () => { cancelled = true }
  }, [authHeaders])

  async function loadReport () {
    if (!rsid) return
    setIsLoadingReport(true)
    setError(null)
    setReport(null)
    try {
      const res = await actionWebInvoke(REPORT_URL, authHeaders(), { rsid, days })
      setReport((res && res.report) || null)
    } catch (e) {
      console.error(e)
      setError(`Could not load report: ${e.message}`)
    } finally {
      setIsLoadingReport(false)
    }
  }

  // build fully-dynamic TableView collection data (mixing static + mapped
  // children breaks React Spectrum's collection builder)
  const columnDefs = report
    ? [{ id: 'label', name: 'Date', align: 'start' }].concat(
      report.columns.map((name, i) => ({ id: `m${i}`, name, align: 'end' })))
    : []
  const rowItems = report
    ? report.rows.map((r, idx) => {
      const cells = { label: r.label }
      r.values.forEach((v, i) => { cells[`m${i}`] = formatNumber(v) })
      return { id: String(idx), cells }
    })
    : []

  return (
    <View width="100%">
      <Flex alignItems="center" gap="size-150">
        <Graph aria-hidden="true" size="L" />
        <Heading level={1}>Adobe Analytics</Heading>
      </Flex>
      <Content>
        <Text>Select a report suite and date range, then load daily traffic metrics.</Text>
      </Content>

      {!actionsReady && (
        <InlineAlert variant="info" marginTop="size-200">
          <Heading>Backend not available yet</Heading>
          <Content>
            Deploy with <code>aio app deploy</code> or run locally with <code>aio app run</code> so the
            Analytics actions become reachable.
          </Content>
        </InlineAlert>
      )}

      {error && (
        <InlineAlert variant="negative" marginTop="size-200">
          <Heading>Error</Heading>
          <Content>{error}</Content>
        </InlineAlert>
      )}

      <Flex direction="row" gap="size-200" marginTop="size-300" marginBottom="size-200" alignItems="end" wrap>
        <Picker
          label="Report suite"
          placeholder="Select a report suite"
          items={suites.map((s) => ({ id: s.rsid, name: s.name }))}
          selectedKey={rsid}
          onSelectionChange={setRsid}
          isLoading={isLoadingSuites}
          isDisabled={!actionsReady}
          width="size-3600"
        >
          {(item) => <Item key={item.id}>{item.name}</Item>}
        </Picker>

        <Picker
          label="Date range"
          items={DATE_RANGES}
          selectedKey={days}
          onSelectionChange={(k) => setDays(String(k))}
          isDisabled={!actionsReady}
          width="size-2400"
        >
          {(item) => <Item key={item.id}>{item.name}</Item>}
        </Picker>

        <Button
          variant="accent"
          onPress={loadReport}
          isPending={isLoadingReport}
          isDisabled={!actionsReady || !rsid}
        >
          <Text>Load Report</Text>
        </Button>
      </Flex>

      {isLoadingReport && (
        <Flex alignItems="center" justifyContent="center" height="size-3000">
          <ProgressCircle aria-label="Loading report" isIndeterminate size="L" />
        </Flex>
      )}

      {!isLoadingReport && report && (
        <View marginTop="size-200">
          {/* summary totals */}
          <Grid columns={{ base: ['1fr'], M: ['1fr', '1fr', '1fr'] }} gap="size-200" marginBottom="size-300">
            {report.columns.map((label, i) => (
              <View key={label} backgroundColor="gray-100" borderRadius="medium" padding="size-200">
                <Text>{label}</Text>
                <Heading level={2} marginTop="size-50" marginBottom="size-0">
                  {formatNumber(report.totals[i])}
                </Heading>
              </View>
            ))}
          </Grid>

          <Divider size="S" marginBottom="size-200" />

          <TableView
            aria-label="Daily analytics report"
            renderEmptyState={() => (
              <IllustratedMessage>
                <Heading>No data</Heading>
                <Content>This report suite returned no rows for the selected range.</Content>
              </IllustratedMessage>
            )}
          >
            <TableHeader columns={columnDefs}>
              {(column) => (
                <Column key={column.id} align={column.align}>{column.name}</Column>
              )}
            </TableHeader>
            <TableBody items={rowItems}>
              {(item) => (
                <Row>
                  {(columnKey) => <Cell>{item.cells[columnKey]}</Cell>}
                </Row>
              )}
            </TableBody>
          </TableView>
        </View>
      )}
    </View>
  )
}

Analytics.propTypes = {
  runtime: PropTypes.any,
  ims: PropTypes.any
}

export default Analytics
