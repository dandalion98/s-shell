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
console.log("init accts")
let accounts = []
let asset = {}

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
}

function initLivenet() {
    server = stellarPay.liveServer()

    try {
        assets = require("./config/assets_live.json")
    } catch (error) {}

    loadTrustedIssuers()
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
}

async function addSigner(s) {
    console.log("adding signer: s=" + server)
    let a = await server.getAccount(accounts)
    await a.addSigner(s)
}

async function removeSigner(s) {
    console.log("adding signer: s=" + server)
    let a = await server.getAccount(accounts)
    await a.removeSigner(s)
}

async function setWeights(l, m, h) {
    console.log("adding signer: s=" + server)
    let a = await server.getAccount(accounts)
    await a.setWeights(parseInt(l), parseInt(m), parseInt(h))
}

async function lockout() {
    console.log("locking out account")
    let a = await server.getAccount(accounts)
    await a.lockout()
}


async function setDomain(d) {
    console.log("setting dom: d=" + d)
    let a = await server.getAccount(accounts)
    await a.setHomeDomain(d)
}

async function load(f, pass) {
    console.log("loading")
    let cmd = "openssl enc -base64 -d -aes-256-cbc -a -salt -k " + pass + " -in " + f
    // console.log(cmd)
    let out = await exec(cmd);
    out = out.stdout.trim()
    out = out.split(".")
    accounts.push({ address: out[0], seed: out[1] })
    console.log("loaded acct " + out[0])
}

async function store(f, address, seed, pass) {
    let o = `${address}.${seed}`
    let cmd = `echo ${o} | openssl enc -base64 -e -aes-256-cbc -a -salt -k ${pass} -out ${f}`
    let { out, err } = await exec(cmd);
}

async function createOffer(selling, buying, price, amount) {
    buying = getAsset(buying)
    selling = getAsset(selling)
    let a = getAccount()
    let o = await a.createOffer(selling, buying, price, amount)
    console.dir(o)
}

async function deleteOffer(walletName, offerId) {
    try {
        let a = getAccount()
        let o = await a.deleteOffer(offerId)
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
    if (amt > 100 && !asset) {
        throw new Error("too much native xlm! check!")
    }

    let a = await server.getAccount(accounts)
    await a.sendPayment(dest, String(amt), memo, asset)
}

async function test() {
}

function info() {
    console.log("accounts")
    for (let a of accounts) {
        console.log(a.address)
    }

    console.log("")
    console.log("asset=")
    console.dir(asset)
}

initLivenet()

test()

let rs = repl.start({ prompt: '> ' })
rs.context.load = load
rs.context.pay = pay
rs.context.signer = addSigner
rs.context.offer = createOffer
rs.context.deleteOffer = deleteOffer
rs.context.store = store
rs.context.asset = setAsset
rs.context.testnet = initTestnet
rs.context.livenet = initLivenet
rs.context.info = info
rs.context.clear = clear
rs.context.domain = setDomain
rs.context.weights = setWeights
rs.context.lockout = lockout

process.on('unhandledRejection', (reason, p) => {
    console.log('Unhandled Rejection at: Promise', p, 'reason:', reason);
});