import { connect } from 'react-redux'
import { bindActionCreators } from 'redux'

import ChannelHeader from '../../../components/widgets/channels/ChannelHeader'
import channelsHandlers from '../../../store/handlers/channels'

import channelSelectors from '../../../store/selectors/channel'

import { messageType } from '../../../../shared/static'

export const mapStateToProps = state => {
  const members = channelSelectors
    .messages()(state)
    .reduce((acc, msg) => {
      return acc.add(msg.sender.replyTo)
    }, new Set())
  return {
    channel: channelSelectors.data(state),
    members: members,
    showAdSwitch: !!channelSelectors
      .messages()(state)
      .find(msg => msg.type === messageType.AD)
  }
}
export const mapDispatchToProps = dispatch =>
  bindActionCreators(
    {
      updateShowInfoMsg: channelsHandlers.epics.updateShowInfoMsg
    },
    dispatch
  )
export default connect(mapStateToProps, mapDispatchToProps)(ChannelHeader)
