import Immutable from 'immutable'
import { createAction, handleActions } from 'redux-actions'
import { DateTime } from 'luxon'
import { remote } from 'electron'
import { getVault } from '../../vault'
import identitySelectors from '../selectors/identity'
import offersSelectors from '../selectors/offers'
import directMessagesQueue from '../selectors/directMessagesQueue'
import { messages as zbayMessages } from '../../zbay'
import channelSelectors from '../selectors/channel'
import contactsSelectors from '../selectors/contacts'
import channelHandlers from './channel'
import contactsHandlers from './contacts'
import directMessagesQueueHandlers from './directMessagesQueue'
import { messageType, actionTypes } from '../../../shared/static'
import appSelectors from '../selectors/app'
import appHandlers from './app'

import * as Here from './offers'

export const Offer = Immutable.Record(
  {
    address: '',
    itemId: '',
    name: '',
    lastSeen: '',
    messages: Immutable.List(),
    newMessages: Immutable.List()
  },
  'Offer'
)
const initialState = Immutable.Map()

const setMessages = createAction(actionTypes.SET_OFFER_MESSAGES)
const addOffer = createAction(actionTypes.ADD_OFFER)
const cleanNewMessages = createAction(actionTypes.CLEAN_OFFER_NEW_MESSAGESS)
const setLastSeen = createAction(actionTypes.SET_OFFER_LAST_SEEN)
const appendMessages = createAction(actionTypes.APPEND_OFFER_MESSAGES)
const appendNewMessages = createAction(actionTypes.APPEND_NEW_OFFER_MESSAGES)
const setOfferMessageBlockTime = createAction(
  actionTypes.SET_OFFER_MESSAGE_BLOCKTIME
)

export const actions = {
  setMessages,
  addOffer,
  cleanNewMessages,
  setLastSeen,
  appendMessages,
  appendNewMessages,
  setOfferMessageBlockTime
}
const createOfferAdvert = ({ payload, history }) => async (
  dispatch,
  getState
) => {
  await dispatch(createOffer({ payload }))
  await dispatch(
    contactsHandlers.epics.updateDeletedChannelTimestamp({
      address: payload.id + payload.offerOwner,
      timestamp: 0
    })
  )
  history.push(
    `/main/offers/${payload.id + payload.offerOwner}/${payload.address}`
  )
}
const createOffer = ({ payload }) => async (dispatch, getState) => {
  const offers = offersSelectors.offers(getState())
  if (!offers.find(e => e.itemId === payload.id + payload.offerOwner)) {
    const identityId = identitySelectors.id(getState())
    await getVault().offers.importOffer(identityId, payload)
    await dispatch(Here.loadVaultContacts())
  }
}
export const loadVaultContacts = () => async (dispatch, getState) => {
  const identityId = identitySelectors.id(getState())
  const offersVault = await getVault().offers.listOffers(identityId)
  const offers = offersSelectors.offers(getState())
  offersVault.forEach(async offer => {
    if (!offers.find(e => e.itemId === offer.offerId)) {
      const newOffer = new Offer({
        address: offer.address,
        itemId: offer.offerId,
        name: offer.name,
        lastSeen: offer.lastSeen
      })
      await dispatch(addOffer({ newOffer }))
      const message = await getVault().adverts.getAdvert(
        offer.offerId.substring(0, 64)
      )
      await dispatch(appendMessages({ message, itemId: offer.offerId }))
    }
  })
}

export const initMessage = () => async (dispatch, getState) => {
  const identityId = identitySelectors.id(getState())
  const offers = offersSelectors.offers(getState())
  const identityAddress = identitySelectors.address(getState())
  await offers.forEach(async offer => {
    const vaultMessages = await getVault().offers.listMessages({
      identityId,
      offerId: offer.itemId
    })
    const contact = contactsSelectors.contact(offer.address)(getState())
    const vaultToDisplayableMessages = vaultMessages.map(msg => {
      return zbayMessages.vaultToDisplayableMessage({
        message: {
          ...msg.properties,
          message: JSON.parse(msg.properties['message']).text,
          shippingData: JSON.parse(msg.properties['message']).shippingData,
          tag: JSON.parse(msg.properties['message']).tag,
          offerOwner: JSON.parse(msg.properties['message']).offerOwner,
          sender: {
            replyTo: msg.properties.sender,
            username: msg.properties.senderUsername
          },
          createdAt: parseInt(msg.properties.createdAt),
          type: parseInt(msg.properties.type)
        },
        identityAddress,
        receiver: { replyTo: offer.address, username: contact.username }
      })
    })
    await dispatch(
      setMessages({
        messages: vaultToDisplayableMessages,
        itemId: offer.itemId
      })
    )
  })
}
const refreshMessages = id => async (dispatch, getState) => {
  const identityId = identitySelectors.id(getState())
  const offer = offersSelectors.offer(id)(getState())
  const identityAddress = identitySelectors.address(getState())
  const vaultMessages = await getVault().offers.listMessages({
    identityId,
    offerId: id
  })
  const contact = contactsSelectors.contact(offer.address)(getState())
  const vaultToDisplayableMessages = vaultMessages.map(msg => {
    return zbayMessages.vaultToDisplayableMessage({
      message: {
        ...msg.properties,
        message: JSON.parse(msg.properties['message']).text,
        shippingData: JSON.parse(msg.properties['message']).shippingData,
        tag: JSON.parse(msg.properties['message']).tag,
        offerOwner: JSON.parse(msg.properties['message']).offerOwner,
        sender: {
          replyTo: msg.properties.sender,
          username: msg.properties.senderUsername
        },
        createdAt: parseInt(msg.properties.createdAt),
        type: parseInt(msg.properties.type)
      },
      identityAddress,
      receiver: { replyTo: offer.address, username: contact.username }
    })
  })
  vaultToDisplayableMessages.forEach(msg => {
    if (!offer.messages.find(m => m.id === msg.id)) {
      dispatch(appendMessages({ message: msg, itemId: offer.itemId }))
    }
  })
}

const sendItemMessageOnEnter = event => async (dispatch, getState) => {
  const enterPressed = event.nativeEvent.keyCode === 13
  const shiftPressed = event.nativeEvent.shiftKey === true
  const privKey = identitySelectors.signerPrivKey(getState())
  const dmQueue = directMessagesQueue.queue(getState())
  const channel = channelSelectors.channel(getState()).toJS()
  const messageToSend = channelSelectors.message(getState())
  const currentMessage = dmQueue.find(
    dm =>
      dm.get('recipientAddress') === channel.address &&
      dm.message.get('type') === messageType.ITEM_BASIC
  )
  const currentMessageKey = dmQueue.findKey(
    dm =>
      dm.get('recipientAddress') === channel.address &&
      dm.message.get('type') === messageType.ITEM_BASIC
  )
  if (enterPressed && !shiftPressed) {
    event.preventDefault()
    const messageQueueLock = appSelectors.directMessageQueueLock(getState())
    let locked = false
    if (!messageQueueLock) {
      await dispatch(appHandlers.actions.lockDmQueue())
      locked = true
    }
    let message
    if (currentMessage !== undefined && locked) {
      await dispatch(
        directMessagesQueueHandlers.actions.removeMessage(currentMessageKey)
      )
      message = zbayMessages.createMessage({
        messageData: {
          type: zbayMessages.messageType.ITEM_BASIC,
          data: {
            itemId: channel.id.substring(0, 64),
            text:
              currentMessage.message.getIn(['message', 'text']) +
              '\n' +
              messageToSend
          }
        },
        privKey
      })
    } else {
      message = zbayMessages.createMessage({
        messageData: {
          type: zbayMessages.messageType.ITEM_BASIC,
          data: {
            itemId: channel.id.substring(0, 64),
            text: messageToSend
          }
        },
        privKey
      })
    }
    dispatch(
      directMessagesQueueHandlers.epics.addDirectMessage(
        {
          message,
          recipientAddress: channel.address,
          recipientUsername: channel.id.substring(64)
        },
        null,
        false
      )
    )
    dispatch(channelHandlers.actions.setMessage(''))
    if (locked) {
      dispatch(appHandlers.actions.unlockDmQueue())
    }
  }
}
const updateLastSeen = ({ itemId }) => async (dispatch, getState) => {
  const identity = identitySelectors.data(getState())
  const lastSeen = DateTime.utc()
  const unread = offersSelectors.newMessages(itemId)(getState()).size
  remote.app.badgeCount = remote.app.badgeCount - unread
  await getVault().offers.updateLastSeen({
    identityId: identity.get('id'),
    offerId: itemId,
    lastSeen
  })
  dispatch(setLastSeen({ itemId, lastSeen }))
  dispatch(cleanNewMessages({ itemId }))
}
export const epics = {
  createOfferAdvert,
  loadVaultContacts,
  initMessage,
  sendItemMessageOnEnter,
  // sendItemTransferMessage,
  refreshMessages,
  createOffer,
  updateLastSeen
}

export const reducer = handleActions(
  {
    [setMessages]: (state, { payload: { itemId, messages } }) =>
      state.update(itemId, Offer(), item =>
        item.set('messages', item.messages.concat(messages))
      ),
    [addOffer]: (state, { payload: { newOffer } }) =>
      state.merge({ [newOffer.itemId]: newOffer }),
    [cleanNewMessages]: (state, { payload: { itemId } }) =>
      state.update(itemId, Offer(), item =>
        item.set('newMessages', Immutable.List())
      ),
    [appendMessages]: (state, { payload: { itemId, message } }) =>
      state.update(itemId, Offer(), item =>
        item.set('messages', item.messages.push(message))
      ),
    [appendNewMessages]: (state, { payload: { itemId, message } }) =>
      state.update(itemId, Offer(), item =>
        item.set('newMessages', item.newMessages.push(message))
      ),
    [setLastSeen]: (state, { payload: { itemId, lastSeen } }) =>
      state.update(itemId, Offer(), item => item.set('lastSeen', lastSeen)),
    [setOfferMessageBlockTime]: (
      state,
      { payload: { itemId, messageId, blockTime } }
    ) =>
      state.update(itemId, Offer(), cm =>
        cm.update('messages', messages => {
          const index = messages.findIndex(msg => msg.id === messageId)
          return messages.setIn([index, 'blockTime'], blockTime)
        })
      )
  },
  initialState
)
export default {
  actions,
  epics,
  reducer,
  loadVaultContacts
}
