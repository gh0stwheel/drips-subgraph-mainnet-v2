import { BigInt, Bytes } from "@graphprotocol/graph-ts"
import { MultiHash } from "../generated/MetaData/MetaData"
import { DripsSet, DripsReceiverSeen, SplitsSet, SplitsReceiverSeen} from "../generated/DripsHub/DripsHub"
import {
  Collected
} from "../generated/DripsHub/DripsHub"
import { User, DripsEntry, UserAssetConfig, DripsSetEvent, HashToDripsSetDetail, DripsReceiverSeenEvent, SplitsEntry,
  SplitsSetEvent, HashToSplitsSetDetail, SplitsReceiverSeenEvent, CollectedEvent, IdentityMetaData} from "../generated/schema"
import { store,ethereum,log } from '@graphprotocol/graph-ts'

export function handleIdentityMetaData(event: MultiHash): void {

  let id = event.params.addr.toHex()
  let identityMetaData = IdentityMetaData.load(id)
  if (!identityMetaData) {
    identityMetaData = new IdentityMetaData(id)
  }
  identityMetaData.key = event.params.id
  identityMetaData.multiHash = event.params.multiHash
  identityMetaData.save()
}

export function handleCollected(event: Collected): void {

  let userId = event.params.userId.toString()
  let assetId = event.params.assetId.toString()
  let userAssetConfigId = userId + "-" + assetId

  let userAssetConfig = UserAssetConfig.load(userAssetConfigId)

  if (!userAssetConfig) {
    userAssetConfig = new UserAssetConfig(userAssetConfigId)
    userAssetConfig.user = userId
    userAssetConfig.balance = new BigInt(0)
    userAssetConfig.dripsEntryIds = []
  }

  userAssetConfig.amountCollected = userAssetConfig.amountCollected.plus(event.params.collected)
  userAssetConfig.save()

  let collectedEvent = new CollectedEvent(event.transaction.hash.toHex() + "-" + event.logIndex.toString())
  collectedEvent.user = userId
  collectedEvent.assetId = event.params.assetId
  collectedEvent.collected = event.params.collected
  collectedEvent.blockTimestamp = event.block.timestamp
}

export function handleDripsSet(event: DripsSet): void {

  // If the User doesn't exist, create it
  let userId = event.params.userId.toString()
  let user = User.load(userId)
  if (!user) {
    user = new User(userId)
    user.save()
  }

  // Next create or update the UserAssetConfig and clear any old DripsEntries if needed
  let userAssetConfigId = event.params.userId.toString() + "-" + event.params.assetId.toString()
  let userAssetConfig = UserAssetConfig.load(userAssetConfigId)
  if (!userAssetConfig) {
    userAssetConfig = new UserAssetConfig(userAssetConfigId)
    userAssetConfig.user = userId
    userAssetConfig.balance = new BigInt(0)
    userAssetConfig.dripsEntryIds = []
  } else {
    // If this is an update, we need to delete the old DripsEntry values and clear the
    // dripsEntryIds field
    if (event.params.receiversHash != userAssetConfig.assetConfigHash) {
      let newDripsEntryIds: string[] = []
      for (let i = 0; i<userAssetConfig.dripsEntryIds.length; i++) {
        let dripsEntryId = userAssetConfig.dripsEntryIds[i]
        let dripsEntry = DripsEntry.load(dripsEntryId)
        if (dripsEntry) {
          store.remove('DripsEntry', dripsEntryId)
        }
      }
      userAssetConfig.dripsEntryIds = newDripsEntryIds
    }
  }
  userAssetConfig.assetConfigHash = event.params.receiversHash
  userAssetConfig.save()

  // Add the DripsSetEvent
  let dripsSetEventId = event.transaction.hash.toHex() + "-" + event.logIndex.toString()
  let dripsSetEvent = new DripsSetEvent(dripsSetEventId)
  dripsSetEvent.userId = event.params.userId
  dripsSetEvent.assetId = event.params.assetId
  dripsSetEvent.receiversHash = event.params.receiversHash
  dripsSetEvent.balance = event.params.balance
  dripsSetEvent.blockTimestamp = event.block.timestamp
  dripsSetEvent.save()

  // TODO -- we need to add some kind of sequence number so we can historically order DripsSetEvents that occur within the same block

  // Add the HashToDripsSetDetail here
  let hashToDripsSetDetail = HashToDripsSetDetail.load(event.params.receiversHash.toHexString())
  if (!hashToDripsSetDetail) {
    hashToDripsSetDetail = new HashToDripsSetDetail(event.params.receiversHash.toHexString())
  }
  hashToDripsSetDetail.userId = event.params.userId
  hashToDripsSetDetail.assetId = event.params.assetId
  hashToDripsSetDetail.currentDripsSetEvent = dripsSetEventId
  hashToDripsSetDetail.save()
}

export function handleDripsReceiverSeen(event: DripsReceiverSeen): void {

  let receiversHash = event.params.receiversHash
  let hashToDripsSetDetail = HashToDripsSetDetail.load(receiversHash.toHexString())

  // We need to use the HashToDripsSetDetail to look up the assetId associated with this receiverHash
  if (hashToDripsSetDetail) {
    let userAssetConfigId = hashToDripsSetDetail.userId.toString() + "-" + hashToDripsSetDetail.assetId.toString()
    let userAssetConfig = UserAssetConfig.load(userAssetConfigId)
    if (userAssetConfig) {
      
      // Now we can create the DripsEntry
      if (!userAssetConfig.dripsEntryIds) userAssetConfig.dripsEntryIds = []
      let newDripsEntryIds = userAssetConfig.dripsEntryIds
      let dripsEntryId = hashToDripsSetDetail.userId.toString() + "-" + event.params.userId.toString() + "-" + hashToDripsSetDetail.assetId.toString()
      let dripsEntry = DripsEntry.load(dripsEntryId)
      if (!dripsEntry) {
        dripsEntry = new DripsEntry(dripsEntryId)
      }
      dripsEntry.sender = hashToDripsSetDetail.userId.toString()
      dripsEntry.senderAssetConfig = userAssetConfigId
      dripsEntry.receiverUserId = event.params.userId
      dripsEntry.config = event.params.config
      dripsEntry.save()

      newDripsEntryIds.push(dripsEntryId)
      userAssetConfig.dripsEntryIds = newDripsEntryIds
      userAssetConfig.save()
    }
  }

  // Create the DripsReceiverSeenEvent entity
  let dripsReceiverSeenEventId = event.transaction.hash.toHex() + "-" + event.logIndex.toString()
  let dripsReceiverSeenEvent = new DripsReceiverSeenEvent(dripsReceiverSeenEventId)
  dripsReceiverSeenEvent.receiversHash = event.params.receiversHash
  dripsReceiverSeenEvent.userId = event.params.userId
  dripsReceiverSeenEvent.config = event.params.config
  dripsReceiverSeenEvent.blockTimestamp = event.block.timestamp

  dripsReceiverSeenEvent.save()

  // TODO -- we need to add some kind of sequence number so we can historically order DripsSetEvents that occur within the same block
}

export function handleSplitsSet(event: SplitsSet): void {

  // If the User doesn't exist, create it
  let userId = event.params.userId.toString()
  let user = User.load(userId)
  if (!user) {
    user = new User(userId)
  } else {
    // If this is an update, we need to delete the old SplitsEntry values and clear the
    // splitsEntryIds field
    if (event.params.receiversHash != user.splitsReceiversHash) {
      let newDripsEntryIds: string[] = []
      for (let i = 0; i<user.splitsEntries.length; i++) {
        let splitsEntryId = user.splitsEntryIds[i]
        let splitsEntry = SplitsEntry.load(splitsEntryId)
        if (splitsEntry) {
          store.remove('SplitsEntry', splitsEntryId)
        }
      }
      user.splitsEntryIds = newDripsEntryIds
    }
  }
  user.save()

  // Add the HashToSplitsSetDetail
  let hashToSplitsSetDetail = HashToSplitsSetDetail.load(event.params.receiversHash.toHexString())
  if (!hashToSplitsSetDetail) {
    hashToSplitsSetDetail = new HashToSplitsSetDetail(event.params.receiversHash.toHexString())
  }
  hashToSplitsSetDetail.userId = event.params.userId
  hashToSplitsSetDetail.save()

  // Add the SplitsSetEvent
  let splitsSetEventId = event.transaction.hash.toHex() + "-" + event.logIndex.toString()
  let splitsSetEvent = new SplitsSetEvent(splitsSetEventId)
  splitsSetEvent.userId = event.params.userId
  splitsSetEvent.receiversHash = event.params.receiversHash
  splitsSetEvent.blockTimestamp = event.block.timestamp
  splitsSetEvent.save()

  // TODO -- we need to add some kind of sequence number so we can historically order DripsSetEvents that occur within the same block
}

export function handleSplitsReceiverSeen(event: SplitsReceiverSeen): void {

  // If the User doesn't exist, create it
  let userId = event.params.userId.toString()
  let user = User.load(userId)
  if (!user) {
    user = new User(userId)
    user.save()
  }

  let receiversHash = event.params.receiversHash
  let hashToSplitsSetDetail = HashToSplitsSetDetail.load(receiversHash.toHexString())

  // We need to use the HashToSplitsSetDetail to look up the assetId associated with this receiverHash
  if (hashToSplitsSetDetail) {
    // Now we can create the SplitsEntry
    if (!user.splitsEntryIds) user.splitsEntryIds = []
    let newSplitsEntryIds = user.splitsEntryIds
    let splitsEntryId = hashToSplitsSetDetail.userId.toString() + "-" + event.params.userId.toString()
    let splitsEntry = SplitsEntry.load(splitsEntryId)
    if (!splitsEntry) {
      splitsEntry = new SplitsEntry(splitsEntryId)
    }
    splitsEntry.sender = hashToSplitsSetDetail.userId.toString()
    splitsEntry.receiverUserId = event.params.userId
    splitsEntry.weight = event.params.weight
    splitsEntry.save()
    
    newSplitsEntryIds.push(splitsEntryId)
    user.splitsEntryIds = newSplitsEntryIds
    user.save()
  }

  // Create the SplitsReceiverSeenEvent entity
  let splitsReceiverSeenEventId = event.transaction.hash.toHex() + "-" + event.logIndex.toString()
  let splitsReceiverSeenEvent = new SplitsReceiverSeenEvent(splitsReceiverSeenEventId)
  splitsReceiverSeenEvent.receiversHash = event.params.receiversHash
  splitsReceiverSeenEvent.userId = event.params.userId
  splitsReceiverSeenEvent.weight = event.params.weight
  splitsReceiverSeenEvent.blockTimestamp = event.block.timestamp

  splitsReceiverSeenEvent.save()

  // TODO -- we need to add some kind of sequence number so we can historically order DripsSetEvents that occur within the same block
}
