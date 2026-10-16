/*
* <license header>
*/

import React, { useState, useEffect, useRef, useCallback } from 'react'
import PropTypes from 'prop-types'
import {
  View,
  Flex,
  Heading,
  Content,
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
  Text
} from '@adobe/react-spectrum'
import Upload from '@spectrum-icons/workflow/DataUpload'
import Download from '@spectrum-icons/workflow/Download'
import Refresh from '@spectrum-icons/workflow/Refresh'

import allActions from '../config.json'
import actionWebInvoke from '../utils'

// action name -> deployed URL (populated by the CLI at build/run time)
const LIST_URL = allActions['dx-excshell-1/list-files']
const UPLOAD_URL = allActions['dx-excshell-1/upload-file']
const DOWNLOAD_URL = allActions['dx-excshell-1/download-file']

// true once the app has been deployed / `aio app run` has populated config.json
const actionsReady = Boolean(LIST_URL && UPLOAD_URL && DOWNLOAD_URL)

// human-readable byte size
function formatSize (bytes) {
  if (bytes === undefined || bytes === null) return '—'
  const units = ['B', 'KB', 'MB', 'GB']
  let size = Number(bytes)
  let i = 0
  while (size >= 1024 && i < units.length - 1) {
    size /= 1024
    i++
  }
  return `${size.toFixed(i === 0 ? 0 : 1)} ${units[i]}`
}

const Files = (props) => {
  const [files, setFiles] = useState([])
  const [isLoading, setIsLoading] = useState(false)
  const [isUploading, setIsUploading] = useState(false)
  const [error, setError] = useState(null)
  const inputRef = useRef(null)

  // builds the IMS auth headers from the props passed down by App/index.js
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

  const loadFiles = useCallback(async () => {
    if (!actionsReady) return
    setIsLoading(true)
    setError(null)
    try {
      const res = await actionWebInvoke(LIST_URL, authHeaders(), {}, { method: 'GET' })
      setFiles((res && res.files) || [])
    } catch (e) {
      console.error(e)
      setError(`Could not list files: ${e.message}`)
    } finally {
      setIsLoading(false)
    }
  }, [authHeaders])

  // load the file list on mount
  useEffect(() => {
    loadFiles()
  }, [loadFiles])

  // read a File as base64 (without the data: prefix)
  function readAsBase64 (file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = () => resolve(String(reader.result).split(',')[1])
      reader.onerror = () => reject(reader.error)
      reader.readAsDataURL(file)
    })
  }

  async function onFileSelected (event) {
    const file = event.target.files && event.target.files[0]
    // reset the input so selecting the same file again re-triggers change
    event.target.value = ''
    if (!file) return

    setIsUploading(true)
    setError(null)
    try {
      const content = await readAsBase64(file)
      await actionWebInvoke(UPLOAD_URL, authHeaders(), { fileName: file.name, content })
      await loadFiles()
    } catch (e) {
      console.error(e)
      setError(`Upload failed: ${e.message}`)
    } finally {
      setIsUploading(false)
    }
  }

  async function onDownload (fileName) {
    setError(null)
    try {
      const res = await actionWebInvoke(DOWNLOAD_URL, authHeaders(), { fileName })
      if (res && res.url) {
        window.open(res.url, '_blank', 'noopener')
      }
    } catch (e) {
      console.error(e)
      setError(`Download failed: ${e.message}`)
    }
  }

  return (
    <View width="100%">
      <Heading level={1}>Files</Heading>
      <Content>
        <Text>Upload, download, and browse files stored with your application.</Text>
      </Content>

      {!actionsReady && (
        <InlineAlert variant="info" marginTop="size-200">
          <Heading>Backend not available yet</Heading>
          <Content>
            Deploy the app with <code>aio app deploy</code> or run it locally with <code>aio app run</code> so
            the file actions become reachable.
          </Content>
        </InlineAlert>
      )}

      {error && (
        <InlineAlert variant="negative" marginTop="size-200">
          <Heading>Error</Heading>
          <Content>{error}</Content>
        </InlineAlert>
      )}

      <Flex direction="row" gap="size-150" marginTop="size-300" marginBottom="size-200" alignItems="center">
        <Button
          variant="accent"
          isDisabled={!actionsReady}
          isPending={isUploading}
          onPress={() => inputRef.current && inputRef.current.click()}
        >
          <Upload aria-hidden="true" />
          <Text>Upload file</Text>
        </Button>
        <Button
          variant="secondary"
          isQuiet
          isDisabled={!actionsReady || isLoading}
          onPress={loadFiles}
        >
          <Refresh aria-hidden="true" />
          <Text>Refresh</Text>
        </Button>
        {/* hidden native input drives the Spectrum button above */}
        <input
          ref={inputRef}
          type="file"
          style={{ display: 'none' }}
          onChange={onFileSelected}
        />
      </Flex>

      {isLoading
        ? (
          <Flex alignItems="center" justifyContent="center" height="size-3000">
            <ProgressCircle aria-label="Loading files" isIndeterminate size="L" />
          </Flex>
          )
        : (
          <TableView
            aria-label="Stored files"
            renderEmptyState={() => (
              <IllustratedMessage>
                <Heading>No files yet</Heading>
                <Content>Upload a file to get started.</Content>
              </IllustratedMessage>
            )}
          >
            <TableHeader>
              <Column key="name">Name</Column>
              <Column key="size" align="end">Size</Column>
              <Column key="modified">Last modified</Column>
              <Column key="actions" align="end">Actions</Column>
            </TableHeader>
            <TableBody items={files.map((f) => ({ id: f.name, ...f }))}>
              {(item) => (
                <Row key={item.id}>
                  <Cell>{item.name}</Cell>
                  <Cell>{formatSize(item.contentLength)}</Cell>
                  <Cell>{item.lastModified ? new Date(item.lastModified).toLocaleString() : '—'}</Cell>
                  <Cell>
                    <Button variant="primary" isQuiet onPress={() => onDownload(item.name)}>
                      <Download aria-hidden="true" />
                      <Text>Download</Text>
                    </Button>
                  </Cell>
                </Row>
              )}
            </TableBody>
          </TableView>
          )}
    </View>
  )
}

Files.propTypes = {
  runtime: PropTypes.any,
  ims: PropTypes.any
}

export default Files
