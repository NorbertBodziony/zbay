import { Web } from './vendor/buttercup'
import React from 'react'
import { render } from 'react-dom'
import { ipcRenderer } from 'electron'

import Root from './Root'
import store from './store'
import nodeHandlers from './store/handlers/node'
import updateHandlers from './store/handlers/update'
import invitationHandlers from './store/handlers/invitation'
import nodeSelectors from './store/selectors/node'
import { errorNotification } from './store/handlers/utils'
import notificationsHandlers from './store/handlers/notifications'

Web.HashingTools.patchCorePBKDF()

ipcRenderer.on('bootstrappingNode', (event, { bootstrapping, message }) => {
  store.dispatch(nodeHandlers.actions.setBootstrapping(bootstrapping))
  store.dispatch(nodeHandlers.actions.setBootstrappingMessage(message))
})

ipcRenderer.on('newUpdateAvailable', event => {
  store.dispatch(updateHandlers.epics.checkForUpdate())
})

ipcRenderer.on('newInvitation', (event, { invitation }) => {
  if (nodeSelectors.status(store.getState()) === 'healthy1') {
    store.dispatch(invitationHandlers.epics.handleInvitation(invitation))
  } else {
    store.dispatch(
      notificationsHandlers.actions.enqueueSnackbar(
        errorNotification({ message: `Please wait for full node sync before opening invitation` })
      )
    )
  }
})

window.jdenticon_config = {
  lightness: {
    color: [0.31, 0.44],
    grayscale: [0.52, 0.57]
  },
  saturation: {
    color: 0.82,
    grayscale: 0.84
  },
  backColor: '#f3f0f6ff'
}

render(<Root />, document.getElementById('root'))

module.hot.accept()
