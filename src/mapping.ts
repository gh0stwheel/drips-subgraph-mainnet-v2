import { BigInt } from "@graphprotocol/graph-ts"
import {
  RadicleRegistry,
  NewProject,
} from "../generated/RadicleRegistry/RadicleRegistry"
import {
  Collected, Dripping, Dripping1, Split, SplitsUpdated, SplitsUpdatedReceiversStruct, DripsUpdated, DripsUpdated1
} from "../generated/DaiDripsHub/DaiDripsHub"
import { FundingProject, DripsConfig, DripsEntry, SplitsConfig} from "../generated/schema"
import { DripsToken } from '../generated/templates';
import { store } from '@graphprotocol/graph-ts'

export function handleNewProject(event: NewProject): void {

  let entity = new FundingProject(event.params.fundingToken.toHex())
  entity.projectName = event.params.name
  entity.daiCollected = new BigInt(0)

  // Entity fields can be set based on event parameters
  entity.projectOwner = event.params.projectOwner
  entity.dripsTokenTemplate = event.params.dripTokenTemplate
  if (event.block) {
    entity.blockTimestampCreated = event.block.timestamp
  }
  entity.save()

  DripsToken.create(event.params.fundingToken);
}

export function handleCollected(event: Collected): void {

  let entity = FundingProject.load(event.params.user.toHex())

  if (!entity) {
    return
  }

  entity.daiCollected = entity.daiCollected.plus(event.params.collected)
  entity.daiSplit = entity.daiSplit.plus(event.params.split)

  entity.save()
}

export function handleDripping(event: Dripping): void {
  checkDripsConfigExists(event.params.user.toHex())
  let dripId = event.params.user.toHex() + "-" + event.params.receiver.toHex()
  let entity = DripsEntry.load(dripId)

  if (!entity) {
    entity = new DripsEntry(dripId)
  }

  entity.user = event.params.user
  entity.dripsConfig = event.params.user.toHex()
  entity.isAccountDrip = false
  entity.receiver = event.params.receiver
  entity.amtPerSec = event.params.amtPerSec
  entity.endTime = event.params.endTime

  entity.save()
}

export function handleDrippingWithAccount(event: Dripping1): void {
  checkDripsConfigExists(event.params.user.toHex())
  let dripId = event.params.user.toHex() + "-" + event.params.receiver.toHex() + "-" + event.params.account.toHex()
  let entity = DripsEntry.load(dripId)

  if (!entity) {
    entity = new DripsEntry(dripId)
  }

  entity.user = event.params.user
  entity.dripsConfig = event.params.user.toHex()
  entity.isAccountDrip = true
  entity.account = event.params.account
  entity.receiver = event.params.receiver
  entity.amtPerSec = event.params.amtPerSec
  entity.endTime = event.params.endTime

  entity.save()
}

function checkDripsConfigExists(id: string): void {
  let entity = DripsConfig.load(id)
  if (!entity) {
    entity = new DripsConfig(id)
    entity.balance = new BigInt(0)
    // Only save if it didn't already exist
    entity.save()
  }
}

export function handleSplitsUpdated(event: SplitsUpdated): void {
  let splitsConfigId = event.params.user.toHex()
  let splitsConfig = SplitsConfig.load(splitsConfigId)

  if (!splitsConfig) {
    splitsConfig = new SplitsConfig(splitsConfigId)
  }
  splitsConfig.receiverAddresses = []
  splitsConfig.receiverPercentages = []
  
  // Now we need to add the new Splits as entities and to the receiverAddresses field on SplitsConfig
  if (event.params.receivers) {
    for (var i=0;i<event.params.receivers.length;i++) {
      var receiver = event.params.receivers[i]
      if (receiver) {
        if (receiver.receiver) {
          splitsConfig.receiverAddresses.push(receiver.receiver)
        }
        if (receiver.weight) {
          splitsConfig.receiverPercentages.push(receiver.weight)
        }
      }
    }
  }

  splitsConfig.save()
}

export function handleDripsUpdated(event: DripsUpdated): void {
  let id = event.params.user.toHex()
  let entity = DripsConfig.load(id)
  if (!entity) {
    entity = new DripsConfig(id)
  }
  entity.balance = event.params.balance

  entity.save()
}

export function handleDripsUpdatedWithAccount(event: DripsUpdated1): void {
  let id = event.params.user.toHex()
  let entity = DripsConfig.load(id)
  if (!entity) {
    entity = new DripsConfig(id)
  }
  entity.balance = event.params.balance

  entity.save()
}
