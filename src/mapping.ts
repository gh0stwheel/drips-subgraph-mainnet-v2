import { BigInt } from "@graphprotocol/graph-ts"
import {
  RadicleRegistry,
  NewProject,
} from "../generated/RadicleRegistry/RadicleRegistry"
import {
  Collected
} from "../generated/DaiDripsHub/DaiDripsHub"
import { FundingProject } from "../generated/schema"
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
