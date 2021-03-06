import { error } from 'quiver-core/util/error'
import { argsFilter } from 'quiver-core/component/constructor'

import {
  extractStreamHead, headerExtractFilter
} from 'quiver-stream-component'

const invalidCharacters = /[^\s\x20-\x7E]/
const trailingWhiteSpace = /\s$/
const tokenSeparator = /[\(\)\<\>@,;:\\"\/\[\]?=\{\} \t]/

const invalidFieldName = key => {
  return (invalidCharacters.test(key)
    || trailingWhiteSpace.test(key)
    || tokenSeparator.test(key))
}

export const parseHeader = header => {
  let colonIndex = header.indexOf(':')
  if(colonIndex == -1) return [header, '']

  let key = header.slice(0, colonIndex)
  let value = header.slice(colonIndex+1)

  if(invalidFieldName(key)) throw error(400, 'Bad Requesst')

  key = key.trim().toLowerCase()
  value = value.trim().replace(/\s+/g, ' ')

  return [key, value]
}

export const parseSubheaders = field => {
  const subheaders = { }
  const fields = field.split(';')

  const main = fields.shift().trim()

  fields.forEach(
    subfield => {
      let [key, value] = subfield.trim().split('=')
      if(!value) return

      value = value.replace(/^"/, '').replace(/"$/, '')
      subheaders[key] = value
    })

  return [main, subheaders]
}

export const parseHttpHeaders = headerText => {
  if(invalidCharacters.test(headerText))
    throw error(400, 'Bad Request')

  const rawHeaders = headerText.split('\r\n')
  const headers = { }

  rawHeaders.forEach(function(header) {
    const [key, value] = parseHeader(header)

    if(headers[key]) {
      headers[key] += ', ' + value
    } else {
      headers[key] = value
    }
  })

  return headers
}

const headerSeparator = new Buffer('\r\n\r\n')

export const extractHttpHeaders = async (readStream, options) => {
  const [headBuffer, restStream] = await extractStreamHead(
    readStream, headerSeparator, options)

  return [parseHttpHeaders(headBuffer.toString()), restStream]
}

export const httpHeaderFilter = argsFilter(
  args => {
    const header = args.get('header')
    const httpHeaders = parseHttpHeaders(header)
    return args.set('httpHeaders', httpHeaders)
  })
  .addMiddleware(headerExtractFilter(headerSeparator))
  .export()
