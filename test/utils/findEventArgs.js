//This is a modified expectEvent helper from OpenZeppelin
//It returns arguments of found event

const {expectEvent} = require("@openzeppelin/test-helpers");

function findEventArgs (receipt, eventName, eventArgs = {}) {
    // truffle contract receipts have a 'logs' object, with an array of objects
    // with 'event' and 'args' properties, containing the event name and actual
    // values.
    // web3 contract receipts instead have an 'events' object, with properties
    // named after emitted events, each containing an object with 'returnValues'
    // holding the event data, or an array of these if multiple were emitted.

    // The simplest way to handle both of these receipts is to convert the web3
    // event format into the truffle one.
    let event;

    if (isWeb3Receipt(receipt)) {
        const logs = flatten(Object.keys(receipt.events).map(name => {
            if (Array.isArray(receipt.events[name])) {
                return receipt.events[name].map(event => ({ event: name, args: event.returnValues }));
            } else {
                return ({ event: name, args: receipt.events[name].returnValues });
            }
        }));

        event = expectEvent.inLogs(logs, eventName, eventArgs);
    } else if (isTruffleReceipt(receipt)) {
        event = expectEvent.inLogs(receipt.logs, eventName, eventArgs);
    } else {
        throw new Error('Unknown transaction receipt object');
    }

    return event.args;
}

function isWeb3Receipt (receipt) {
  return 'events' in receipt && typeof receipt.events === 'object';
}

function isTruffleReceipt (receipt) {
  return 'logs' in receipt && typeof receipt.logs === 'object';
}


module.exports = findEventArgs;
