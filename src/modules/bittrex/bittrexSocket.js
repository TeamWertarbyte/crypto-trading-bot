const jsonic = require('jsonic')
const signalR = require('signalr-client')
const debug = require('debug')('bittrex:socket')

function createSocket (baseUrl, hubs) {
  const wsclient = new signalR.client(baseUrl, hubs) // eslint-disable-line
  if (debug.enabled) {
    wsclient.serviceHandlers = {
      bound () {
        debug('Websocket bound')
      },
      connectFailed (error) {
        debug('Websocket connectFailed: ', error)
      },
      disconnected () {
        debug('Websocket disconnected')
      },
      onerror (error) {
        debug('Websocket onerror: ', error)
      },
      bindingError (error) {
        debug('Websocket bindingError: ', error)
      },
      connectionLost (error) {
        debug('Connection Lost: ', error)
      },
      reconnecting (retry) {
        debug('Websocket Retrying: ', retry)
        return false // false = retry; true = abort retry
      }
    }
  } else {
    wsclient.serviceHandlers = {
      reconnecting (retry) {
        return false // false = retry; true = abort retry
      }
    }
  }
  return wsclient
}

function setMessageReceivedHandler (wsclient, callback) {
  wsclient.serviceHandlers.messageReceived = ({ utf8Data }) => {
    try {
      const data = jsonic(utf8Data)
      if (data && data.M) {
        data.M.forEach(M => {
          callback(M)
        })
      } else {
        debug('Unhandled data', data)
        callback({'unhandled_data': data})
      }
    } catch (e) {
      console.error('Error handling Bittrex socket message', e)
    }
    return false
  }
}

export function subscribeToMarkets (baseUrl, hubs, markets, callback) {
  const wsclient = createSocket(baseUrl, hubs)
  wsclient.serviceHandlers.connected = (connection) => {
    for (const market of markets) {
      wsclient.call('CoreHub', 'SubscribeToExchangeDeltas', market).done((err, result) => {
        if (err) {
          return console.error(err)
        } else if (result === true) {
          debug(`Subscribed to ${market}`)
        }
      })
    }
  }
  setMessageReceivedHandler(wsclient, callback)
  return wsclient
}

export function listen (baseUrl, hubs, callback) {
  const wsclient = createSocket(baseUrl, hubs)
  setMessageReceivedHandler(wsclient, callback)
  return wsclient
}
