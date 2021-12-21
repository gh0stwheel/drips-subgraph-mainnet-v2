import { BigInt } from "@graphprotocol/graph-ts"
import {
  RadicleRegistry,
  NewProject,
} from "../generated/RadicleRegistry/RadicleRegistry"
import {
  Collected, Dripping
} from "../generated/DaiDripsHub/DaiDripsHub"
import { FundingProject } from "../generated/schema"
import { Drip } from "../generated/schema"
import { DripsToken } from '../generated/templates';

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

export function handleDrippingUpdate(event: Dripping): void {

  let dripId = event.params.user.toHex() + "-" + event.params.receiver.toHex()
  let entity = Drip.load(dripId)

  if (!entity) {
    entity = new Drip(dripId)
  }

  entity.user = event.params.user
  entity.receiver = event.params.receiver
  entity.amtPerSec = event.params.amtPerSec
  entity.endTime = event.params.endTime

  entity.save()
}
