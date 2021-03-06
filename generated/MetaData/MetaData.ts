// THIS IS AN AUTOGENERATED FILE. DO NOT EDIT THIS FILE DIRECTLY.

import {
  ethereum,
  JSONValue,
  TypedMap,
  Entity,
  Bytes,
  Address,
  BigInt
} from "@graphprotocol/graph-ts";

export class MultiHash extends ethereum.Event {
  get params(): MultiHash__Params {
    return new MultiHash__Params(this);
  }
}

export class MultiHash__Params {
  _event: MultiHash;

  constructor(event: MultiHash) {
    this._event = event;
  }

  get addr(): Address {
    return this._event.parameters[0].value.toAddress();
  }

  get id(): Bytes {
    return this._event.parameters[1].value.toBytes();
  }

  get multiHash(): Bytes {
    return this._event.parameters[2].value.toBytes();
  }
}

export class MetaData extends ethereum.SmartContract {
  static bind(address: Address): MetaData {
    return new MetaData("MetaData", address);
  }

  DEFAULT_ID(): Bytes {
    let result = super.call("DEFAULT_ID", "DEFAULT_ID():(bytes32)", []);

    return result[0].toBytes();
  }

  try_DEFAULT_ID(): ethereum.CallResult<Bytes> {
    let result = super.tryCall("DEFAULT_ID", "DEFAULT_ID():(bytes32)", []);
    if (result.reverted) {
      return new ethereum.CallResult();
    }
    let value = result.value;
    return ethereum.CallResult.fromValue(value[0].toBytes());
  }
}

export class PublishCall extends ethereum.Call {
  get inputs(): PublishCall__Inputs {
    return new PublishCall__Inputs(this);
  }

  get outputs(): PublishCall__Outputs {
    return new PublishCall__Outputs(this);
  }
}

export class PublishCall__Inputs {
  _call: PublishCall;

  constructor(call: PublishCall) {
    this._call = call;
  }

  get id(): Bytes {
    return this._call.inputValues[0].value.toBytes();
  }

  get multiHash(): Bytes {
    return this._call.inputValues[1].value.toBytes();
  }
}

export class PublishCall__Outputs {
  _call: PublishCall;

  constructor(call: PublishCall) {
    this._call = call;
  }
}

export class Publish1Call extends ethereum.Call {
  get inputs(): Publish1Call__Inputs {
    return new Publish1Call__Inputs(this);
  }

  get outputs(): Publish1Call__Outputs {
    return new Publish1Call__Outputs(this);
  }
}

export class Publish1Call__Inputs {
  _call: Publish1Call;

  constructor(call: Publish1Call) {
    this._call = call;
  }

  get multiHash(): Bytes {
    return this._call.inputValues[0].value.toBytes();
  }
}

export class Publish1Call__Outputs {
  _call: Publish1Call;

  constructor(call: Publish1Call) {
    this._call = call;
  }
}
