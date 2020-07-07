import { getVault } from '../../renderer/vault'
import channels from '../../renderer/zcash/channels'

const ensureDefaultChannels = async (identity, network) => {
  const generalChannel = channels.general[network]
  const usersChannel = channels.registeredUsers[network]
  const channelOfChannels = channels.channelOfChannels[network]
  const priceOracleChannel = channels.priceOracle[network]
  const storeChannel = channels.store[network]
  const vaultChannels = await getVault().channels.listChannels(identity.id)
  if (!vaultChannels.find(channel => channel.address === generalChannel.address)) {
    await getVault().channels.importChannel(identity.id, generalChannel)
  }
  if (!vaultChannels.find(channel => channel.address === usersChannel.address)) {
    await getVault().channels.importChannel(identity.id, usersChannel)
  }
  if (!vaultChannels.find(channel => channel.address === channelOfChannels.address)) {
    await getVault().channels.importChannel(identity.id, channelOfChannels)
  }
  if (!vaultChannels.find(channel => channel.address === priceOracleChannel.address)) {
    await getVault().channels.importChannel(identity.id, priceOracleChannel)
  }
  if (!vaultChannels.find(channel => channel.address === storeChannel.address)) {
    await getVault().channels.importChannel(identity.id, storeChannel)
  }
}
export default {
  ensureDefaultChannels
}
