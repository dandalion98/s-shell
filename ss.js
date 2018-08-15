require('app-module-path').addPath("./common_modules")

var stellarPay = require("stellar-pay"),
    log = require('tracer').colorConsole(),
    StellarSdk = require('stellar-sdk'),
    repl = require("repl"),
    util = require('util'),
    execSync = require('child_process').execSync,
    exec = util.promisify(require('child_process').exec);

let server, wallets, assets
let trustedIssuers = []
let accounts = []
let asset = StellarSdk.Asset.native()

function getAsset(name) {
    if (name == "XLM") {
        return StellarSdk.Asset.native()
    }

    if (!assets[name]) {
        console.dir(assets)
        throw new Error("Asset does not exist: " + name)
    }
    return new StellarSdk.Asset(name, assets[name].issuer);
}

function getAccount() {
    return server.getAccount(accounts)
}

function loadTrustedIssuers() {
    trustedIssuers = []
    for (let a in assets) {
        trustedIssuers.push(assets[a].issuer)
    }
}

function initTestnet() {
    server = stellarPay.testServer()
    try {
        assets = require("./config/assets_test.json")
    } catch (error) {}

    loadTrustedIssuers()
    return null    
}

function initLivenet() {
    server = stellarPay.liveServer()

    try {
        assets = require("./config/assets_live.json")
    } catch (error) {}

    loadTrustedIssuers()
    return null    
}

function setAsset(name) {
    if (name == "xlm" || !name) {
        asset = null
    }

    if (!assets[name]) {
        console.dir(assets)
        throw new Error("unknown asset:" + name)
    }

    asset = server.getAsset(name, assets[name].issuer)
    return null
}

async function addSigner(s) {
    let a = await server.getAccount(accounts)
    await a.addSigner(s)
    return null
}

async function removeSigner(s) {
    let a = await server.getAccount(accounts)
    await a.removeSigner(s)
    return null
}

async function setWeights(type, weight) {
    let a = await server.getAccount(accounts)
    await a.setWeights(type, weights)
    return null
}

// WARNING: Danger!!
// async function lockout() {
//     console.log("locking out account")
//     let a = await server.getAccount(accounts)
//     await a.lockout()
// }

async function setInflation(addr) {
    let a = await server.getAccount(accounts)
    await a.setInflation(addr)
    return null    
}

async function setDomain(d) {
    console.log("setting home domain: d=" + d)
    let a = await server.getAccount(accounts)
    await a.setHomeDomain(d)
    return null    
}


async function loads(seed) {
    var sk = StellarSdk.Keypair.fromSecret(seed);
    accounts.push({ address: sk.publicKey(), seed: sk.secret() })
    console.log("loaded account: " + sk.publicKey())
    return null
}

async function load(fpath, pass) {
    console.log("loading")
    let cmd = "openssl enc -base64 -d -aes-256-cbc -a -salt -k " + pass + " -in " + fpath
    // console.log(cmd)
    let out = await exec(cmd);
    out = out.stdout.trim()
    out = out.split(".")
    accounts.push({ address: out[0], seed: out[1] })
    console.log("loaded acct " + out[0])
    return null    
}

async function store(fpath, pass) {
    let account = accounts[0]

    let o = `${account.address}.${account.seed}`
    let cmd = `echo ${o} | openssl enc -base64 -e -aes-256-cbc -a -salt -k ${pass} -out ${fpath}`
    let { out, err } = await exec(cmd);
    console.log("exported current account to " + fpath)
    return null
}

async function stores(fpath, seed, pass) {
    var sk = StellarSdk.Keypair.fromSecret(seed);
    let o = `${sk.publicKey}.${sk.secret()}`
    let cmd = `echo ${o} | openssl enc -base64 -e -aes-256-cbc -a -salt -k ${pass} -out ${fpath}`
    let { out, err } = await exec(cmd);
    console.log("exported seed to " + fpath)
}

async function createOffer(selling, buying, price, amount) {
    buying = getAsset(buying)
    selling = getAsset(selling)
    let a = getAccount()
    let o = await a.createOffer(selling, buying, price, amount)
    console.dir(o)
}

async function deleteOffer(offerId) {
    try {
        let a = getAccount()
        if (offerId) {
            let o = await a.deleteOffer(offerId)
        } else {
            await a.deleteAllOffers()
        }
    } catch (error) {
        console.error(error)
        // console.dir(error.data)
        console.dir(error.data.extras.result_codes)
    }
}

async function clear() {
    accounts = []
}

async function pay(dest, amt, memo) {    
    let a = await server.getAccount(accounts)
    await a.sendPayment(dest, String(amt), memo, asset)
}

async function test() {
}

function info() {
    console.log("Accounts:")
    for (let a of accounts) {
        console.log(a.address)
    }

    console.log("")
    console.log("Default Asset:")
    console.dir(asset)
    return null
}

async function getBalance() {    
    let account = await server.getAccount(accounts)
    let balance = await account.getBalanceFull()
    console.dir(balance)
    return null
}

// function pprint(obj) {
//     var json = JSON.stringify(obj, null, 4);
//     console.dir(json)
// }

initLivenet()

test()

let CMDS = [
    { name: "load", fn: load, desc: "Load an encrypted account file"},
    { name: "loads", fn: loads, desc: "Load a raw account seed"},
    { name: "store", fn:store, desc: "Export account key to an encrypted file"},
    { name: "stores", fn:stores, desc: "Export an account secret to an encrypted file"},
    { name: "pay", fn: pay, desc: "Send a payment using the currently active asset (by default XLM)"},
    { name: "addSigner", fn: addSigner, desc: "Add a signer to the current account"},
    { name: "removeSigner", fn: removeSigner, desc: "Remove a signer to the current account"},    
    { name: "offer", fn: createOffer, desc: "Create an offer. Any custom assets used must be defined in config/assets.json"},
    { name: "deleteOffer", fn:deleteOffer, desc: "Delete an offer by offer id, or delete all offers"},
    { name: "asset", fn: asset, desc: "Sets the currently active asset for sending payments"},
    { name: "testnet", fn: initTestnet, desc: "Use Stellar testnet"},
    { name: "livenet", fn: initLivenet, desc: "Use Stellar livenet (default"},    
    { name: "info", fn: info, desc: "Display info about currently loaded account"},
    { name: "clear", fn: clear, desc: "Clear loaded account"},
    { name: "weights", fn: setWeights, desc: "Set account weights"},
    { name: "balance", fn: getBalance, desc: "Show account balance"},
    { name: "inflation", fn: setInflation, desc: "Set inflation target for account"},
    { name: "help", fn: help, desc: "Show help"},
]

let rs = repl.start({ prompt: 'stellar > ' })
for (let cmd of CMDS) {
    rs.context[cmd.name] = cmd.fn
}

function help() {
    console.log("Supported Commands")
    console.log("-----------------------------")
    for (let cmd of CMDS) {
        console.log(`${cmd.name} - ${cmd.desc}`)
    }
    return null
}

let oldInspect = util.inspect

util.inspect = function (o) { 
    if (o instanceof Promise) {
        return '' 
    } else {
        return oldInspect(o, false, null)
    }
};

process.on('unhandledRejection', (reason, p) => {
    console.log('Unhandled Rejection at: Promise', p, 'reason:', reason);
});


