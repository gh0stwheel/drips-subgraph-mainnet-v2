import { BigInt, Bytes } from "@graphprotocol/graph-ts"
import { MultiHash } from "../generated/MetaData/MetaData"
import { DripsReceiverSeen, DripsSet } from "../generated/DripsHub/DripsHub"
import {
  Collected
} from "../generated/DripsHub/DripsHub"
import { User, DripsEntry, UserAssetConfig, DripsSetEvent, HashToDripsSetDetail, DripsReceiverSeenEvent,
  IdentityMetaData} from "../generated/schema"
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

export function handleDripsSet(event: DripsSet): void {

  // If the User doesn't exist, create it
  let userId = event.params.userId.toString()
  let user = User.load(userId)
  if (!user) {
    user = new User(userId)
    user.save()
  }

  // Next create or update the UserAssetConfig and clear any old DripsEntries if needed
  let userAssetConfigId = event.params.userId.toString() + "-" + event.params.assetId
  let userAssetConfig = UserAssetConfig.load(userAssetConfigId)
  if (!userAssetConfig) {
    userAssetConfig = new UserAssetConfig(userAssetConfigId)
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
  hashToDripsSetDetail.currentDripSetEvent = dripsSetEventId
  hashToDripsSetDetail.save()
}

export function handleDripsReceiverSeen(event: DripsReceiverSeen): void {

  let receiversHash = event.params.receiversHash
  let hashToDripsSetDetail = HashToDripsSetDetail.load(receiversHash.toHexString())

  // We need to use the HashToDripsSetDetail to look up the assetId associated with this receiverHash
  if (hashToDripsSetDetail) {
    let userAssetConfigId = hashToDripsSetDetail.userId + "-" + hashToDripsSetDetail.assetId
    let userAssetConfig = UserAssetConfig.load(userAssetConfigId)
    if (!userAssetConfig) {
      
      // Now we can create the DripsEntry
      let dripsEntryId = hashToDripsSetDetail.userId + "-" + event.params.userId + "-" + hashToDripsSetDetail.assetId
      let dripsEntry = DripsEntry.load(dripsEntryId)
      dripsEntry.sender = hashToDripsSetDetail.userId.toString()
      dripsEntry.senderAssetConfig = userAssetConfigId
      dripsEntry.receiverUserId = event.params.userId
      dripsEntry.config = event.params.config
      
      dripsEntry.save()
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

/*
export function handleCollected(event: Collected): void {
  let userId = event.params.userId.toString()
  let user = DripsUser.load(userId)

  if (!user) {
    user = new DripsUser(userId)
  }

  if (!fundingProject) {
    return
  }

  fundingProject.daiCollected = fundingProject.daiCollected.plus(event.params.collected)
  fundingProject.daiSplit = fundingProject.daiSplit.plus(event.params.split)

  fundingProject.save()
}
*/