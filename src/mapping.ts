import { BigInt } from "@graphprotocol/graph-ts"
import {
  RadicleRegistry,
  NewProject,
} from "../generated/RadicleRegistry/RadicleRegistry"
import {
  Collected, Dripping, Dripping1, Split, SplitsUpdated, SplitsUpdatedReceiversStruct, DripsUpdated, DripsUpdated1
} from "../generated/DaiDripsHub/DaiDripsHub"
import { FundingProject, DripsConfig, DripsEntry, SplitsConfig, SplitsEntry} from "../generated/schema"
import { DripsToken } from '../generated/templates';
import { store,ethereum,log } from '@graphprotocol/graph-ts'

export function handleNewProject(event: NewProject): void {

  let fundingProject = new FundingProject(event.params.fundingToken.toHex())
  fundingProject.projectName = event.params.name
  fundingProject.daiCollected = new BigInt(0)

  // Entity fields can be set based on event parameters
  fundingProject.projectOwner = event.params.projectOwner
  fundingProject.dripsTokenTemplate = event.params.dripTokenTemplate
  if (event.block) {
    fundingProject.blockTimestampCreated = event.block.timestamp
  }
  fundingProject.save()

  DripsToken.create(event.params.fundingToken);
}

export function handleCollected(event: Collected): void {

  let fundingProject = FundingProject.load(event.params.user.toHex())

  if (!fundingProject) {
    return
  }

  fundingProject.daiCollected = fundingProject.daiCollected.plus(event.params.collected)
  fundingProject.daiSplit = fundingProject.daiSplit.plus(event.params.split)

  fundingProject.save()
}

export function handleDripping(event: Dripping): void {
  let dripsConfigId = event.params.user.toHex()
  let dripsConfig = DripsConfig.load(dripsConfigId)
  if (!dripsConfig) {
    dripsConfig = new DripsConfig(dripsConfigId)
    dripsConfig.balance = new BigInt(0)
  }
  dripsConfig.lastUpdatedBlockTimestamp = event.block.timestamp
  dripsConfig.save()

  let dripId = event.params.user.toHex() + "-" + event.params.receiver.toHex()
  let dripsEntry = DripsEntry.load(dripId)

  if (!dripsEntry) {
    dripsEntry = new DripsEntry(dripId)
  }

  dripsEntry.user = event.params.user
  dripsEntry.dripsConfig = event.params.user.toHex()
  dripsEntry.isAccountDrip = false
  dripsEntry.receiver = event.params.receiver
  dripsEntry.amtPerSec = event.params.amtPerSec
  dripsEntry.endTime = event.params.endTime

  dripsEntry.save()
}

export function handleDrippingWithAccount(event: Dripping1): void {
  let dripsConfigId = event.params.user.toHex()
  let dripsConfig = DripsConfig.load(dripsConfigId)
  if (!dripsConfig) {
    dripsConfig = new DripsConfig(dripsConfigId)
    dripsConfig.balance = new BigInt(0)
  }
  dripsConfig.lastUpdatedBlockTimestamp = event.block.timestamp
  dripsConfig.save()

  let dripId = event.params.user.toHex() + "-" + event.params.receiver.toHex() + "-" + event.params.account.toHex()
  let dripsEntry = DripsEntry.load(dripId)

  if (!dripsEntry) {
    dripsEntry = new DripsEntry(dripId)
  }

  dripsEntry.user = event.params.user
  dripsEntry.dripsConfig = event.params.user.toHex()
  dripsEntry.isAccountDrip = true
  dripsEntry.account = event.params.account
  dripsEntry.receiver = event.params.receiver
  dripsEntry.amtPerSec = event.params.amtPerSec
  dripsEntry.endTime = event.params.endTime

  dripsEntry.save()
}

export function handleSplitsUpdated(event: SplitsUpdated): void {
  let splitsConfigId = event.params.user.toHex()
  let splitsConfig = SplitsConfig.load(splitsConfigId)

  if (!splitsConfig) {
    splitsConfig = new SplitsConfig(splitsConfigId)
  } else {
    // Now we need to delete the old Splits entities and clear the receiverAddresses field on SplitsConfig
    for (let i = 0; i < splitsConfig.receiverAddresses.length; i++) {
      let receiverAddress = splitsConfig.receiverAddresses[i]
      let splitId = event.params.user.toHex() + "-" + receiverAddress.toHex()
      store.remove('SplitsEntry', splitId)
    }
    // Clear the receiverAddresses array
    splitsConfig.receiverAddresses.splice(0, splitsConfig.receiverAddresses.length)
    splitsConfig.receiverAddresses = []
  }

  // Now we need to add the new Splits as entities and to the receiverAddresses field on SplitsConfig
  for (let i = 0; i < event.params.receivers.length; i++) {
    // First create the new Split entity and save it
    let receiver = event.params.receivers[i]
    let receiverAddress = receiver.receiver
    let splitId = event.params.user.toHex() + "-" + receiverAddress.toHex()
    let splitsEntry = new SplitsEntry(splitId)
    splitsEntry.sender = event.params.user
    splitsEntry.receiver = receiverAddress
    splitsEntry.splitsConfig = splitsConfigId
    splitsEntry.weight = receiver.weight
    splitsEntry.save()

    // Next add the receiver address to the SplitsConfig
    splitsConfig.lastUpdatedBlockTimestamp = event.block.timestamp
    splitsConfig.receiverAddresses.push(receiverAddress)
  }

  splitsConfig.save()
}

export function handleDripsUpdated(event: DripsUpdated): void {
  let id = event.params.user.toHex()
  let dripsConfig = DripsConfig.load(id)
  if (!dripsConfig) {
    dripsConfig = new DripsConfig(id)
  }
  dripsConfig.balance = event.params.balance

  dripsConfig.lastUpdatedBlockTimestamp = event.block.timestamp
  dripsConfig.save()
}

export function handleDripsUpdatedWithAccount(event: DripsUpdated1): void {
  let id = event.params.user.toHex()
  let dripsConfig = DripsConfig.load(id)
  if (!dripsConfig) {
    dripsConfig = new DripsConfig(id)
  }
  dripsConfig.balance = event.params.balance

  dripsConfig.lastUpdatedBlockTimestamp = event.block.timestamp
  dripsConfig.save()
}
