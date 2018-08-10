# s-shell
s-shell is a CLI shell for securely performing Stellar operations that supports multi-sig.

For security, s-shell works with encrypted account files that are exported from s-cli.

To use, first load the encrypted account file. For multi-sig, do this for each account file (as needed to reach desired key weighting).

# Basic Usage
Custom assets that you trust must be defined in `config/assets.json` (for devnet) and `config/assets_live.json` (for testnet). To resolve ambiguity (in case of multiple assets with same code), assign aliases to assets.

`
{
    "btc-strong" : {
        "code": "BTC",
        "issuer": "GBSTRH4QOTWNSVA6E4HFERETX4ZLSR3CIUBLK7AXYII277PFJC4BBYOG"
    }
}
`

# Basic Examples
#### To start the shell
`node ss.js`

#### Multisig example
`load("<path_to_account_file1>', "<password_for_account1>")`

`load("<path_to_account_file2>', "<password_for_account2>")`

`asset("btc-strong")`

`pay("<target_account_address>", 0.0035, "my_memo")`

# Installation
*git submodule init .*

*git submodule update --remote*

*npm install*

