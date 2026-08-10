import { browser } from 'wxt/browser'

export interface RuntimeMessage {
  type: string
  [key: string]: any
}

export interface MessageSender {
  tab?: {
    id: number
    url?: string
    title?: string
  }
  frameId?: number
  url?: string
  tlsChannelId?: string
}

export type SendResponse = (response?: any) => void
export type MessageListener = (
  message: RuntimeMessage,
  sender: MessageSender,
  sendResponse: SendResponse,
) => boolean | void | Promise<any>

export class BrowserRuntimeStub {
  private messageListeners: Set<MessageListener> = new Set()

  /**
   * Send a message to other parts of the extension
   */
  sendMessage = (message: RuntimeMessage, _options?: { includeTlsChannelId?: boolean }): Promise<any> => {
    return new Promise((resolve, reject) => {
      // Simulate async message handling
      setTimeout(() => {
        let responseHandled = false
        const sendResponse: SendResponse = response => {
          if (responseHandled) {
            console.warn('sendResponse called multiple times')
            return
          }
          responseHandled = true
          resolve(response)
        }

        // Call all registered listeners
        for (const listener of this.messageListeners) {
          try {
            const result = listener(message, {}, sendResponse)

            // If listener returns a promise, handle it
            if (result instanceof Promise) {
              result.then(resolve).catch(reject)
              return
            }

            // If listener returns true, it will handle the response asynchronously
            if (result === true) {
              return
            }
          } catch (error) {
            reject(error)
            return
          }
        }

        // If no listener handled the response, resolve with undefined
        if (!responseHandled) {
          resolve(undefined)
        }
      }, 0)
    })
  }

  onMessage = {
    addListener: (listener: MessageListener): void => {
      this.messageListeners.add(listener)
    },

    removeListener: (listener: MessageListener): void => {
      this.messageListeners.delete(listener)
    },
  }
}

export const browserRuntimeStub = new BrowserRuntimeStub()

export const isExtension = !!browser?.runtime?.id

export const browserRuntime = isExtension ? browser.runtime : browserRuntimeStub
