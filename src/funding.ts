import { DripsToken, NewType, NewStreamingToken, NewToken, Transfer, NewContractURI} from "../generated/RadicleRegistry/DripsToken";
import { FundingProject, TokenType, Token } from "../generated/schema";
import { Address, store, crypto } from "@graphprotocol/graph-ts";
import { BigInt } from "@graphprotocol/graph-ts"
import { concat } from "@graphprotocol/graph-ts/helper-functions";

export function handleNewType(event: NewType): void {
  let entity = new TokenType(event.address.toHex() + "-" + event.params.nftType.toString())

  entity.tokenRegistryAddress = event.address
  entity.tokenTypeId = event.params.nftType
  entity.limit = event.params.limit
  entity.minAmtPerSec = event.params.minAmt
  entity.streaming = event.params.streaming
  entity.fundingProject = event.address.toHex()
  entity.ipfsHash = event.params.ipfsHash
  entity.currentTotalAmtPerSec = new BigInt(0)
  entity.currentTotalGiven = new BigInt(0)

  entity.save()
}

export function handleNewStreamingToken(event: NewStreamingToken): void {
  let entity = new Token(event.params.tokenId.toHex() + event.address.toHex())

  entity.tokenId = event.params.tokenId
  entity.tokenRegistryAddress = event.address
  entity.tokenType = event.address.toHex() + "-" + event.params.typeId.toString()
  entity.tokenReceiver = event.params.receiver
  entity.amtPerSec = event.params.amtPerSec
  entity.fundingProject = event.address.toHex()

  entity.save()

  // Now we need to add the amtPerSec to the currentTotalAmtPerSec on the TokenType
  let tokenType = TokenType.load(entity.tokenType)
  if (!tokenType) {
    return
  }
  tokenType.currentTotalAmtPerSec = tokenType.currentTotalAmtPerSec.plus(entity.amtPerSec)
  tokenType.save()
}

export function handleNewToken(event: NewToken): void {
  let entity = new Token(event.params.tokenId.toHex() + event.address.toHex())

  entity.tokenId = event.params.tokenId
  entity.tokenRegistryAddress = event.address
  entity.tokenType = event.address.toHex() + "-" + event.params.typeId.toString()
  entity.tokenReceiver = event.params.receiver
  entity.giveAmt = event.params.giveAmt
  entity.fundingProject = event.address.toHex()

  entity.save()

  // Now we need to add the amtPerSec to the currentTotalAmtPerSec on the TokenType
  let tokenType = TokenType.load(entity.tokenType)
  if (!tokenType) {
    return
  }
  tokenType.currentTotalGiven = tokenType.currentTotalAmtPerSec.plus(entity.giveAmt)
  tokenType.save()
}

export function handleTransfer(event: Transfer): void {
  let entity = Token.load(event.params.tokenId.toHex() + event.address.toHex())

  if (!entity) {
    return
  }

  entity.tokenReceiver = event.params.to
  
  entity.save()
}

export function handleNewContractURI(event: NewContractURI): void {

  let entity = FundingProject.load(event.address.toHex())

  if (!entity) {
    return
  }

  entity.ipfsHash = event.params.contractURI

  entity.save()
}
