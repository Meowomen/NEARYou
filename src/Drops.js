import 'regenerator-runtime/runtime';
import React, { useState, useEffect } from 'react';
import * as nearApi from 'near-api-js'
import { get, set, del } from 'idb-keyval'
import * as clipboard from "clipboard-polyfill/text";
import {
    nearTo, nearToInt, toNear, BOATLOAD_OF_GAS, DROP_GAS, NETWORK_ID, ACCESS_KEY_ALLOWANCE
} from './util/near-util'
import './Drops.scss';

const Drops = (props) => {

    const {
        contractName,
        walletUrl
    } = window.nearConfig

    const {
        currentUser, currentUser: { account_id }, updateUser
    } = props

    const dropStorageKey = '__drops_' + account_id

    const [drops, setDrops] = useState([])
    const [showUsed, setShowUsed] = useState(false)
    const [urlDrop, setUrlDrop] = useState()

    useEffect(() => {
        updateDrops(true)
        const url = new URL(window.location.href)
        const key = url.searchParams.get('key')
        const amount = url.searchParams.get('amount')
        const from = url.searchParams.get('from')
        const limited = url.searchParams.get('limited') === 'true'
        if (key && amount && from) {
            setUrlDrop({ key, amount, from, limited })
        }
        window.clearDrops = () => del(dropStorageKey)
    }, [])
    /********************************
    Update drops (idb + state), add drop, remove drop
    ********************************/
    async function getDrop(public_key) {
        const drops = await get(dropStorageKey) || []
        return drops.find((d) => d.public_key === public_key)
    }
    async function updateDrops(check = false) {
        const drops = (await get(dropStorageKey) || [])
        for (let drop of drops) {
            const { public_key: key } = drop
            drop.walletLink = await getWalletLink(key)
            if (!check) {
                continue
            }
            // check drop is valid
            const { contract } = window
            let res
            try {
                res = await contract.get_key_balance({ key })
            } catch (e) {
                console.warn(e)
            }
            if (!res || nearToInt(res) < 1) {
                await removeDrop(key)
            }
        }
        setDrops(drops)
    }
    async function removeDrop(public_key) {
        // get the drops from idb and remove the one matching this public_key
        const drops = await get(dropStorageKey) || []
        const drop = drops.find((d) => d.public_key === public_key)
        drop.used = true
        await set(dropStorageKey, drops)
        updateDrops()
    }
    async function addDrop(newKeyPair) {
        const drops = await get(dropStorageKey) || []
        drops.push(newKeyPair)
        await set(dropStorageKey, drops)
        updateDrops()
    }
    /********************************
    Drop links
    ********************************/
    async function getWalletLink(public_key) {
        const { secretKey } = await getDrop(public_key)
        return `${walletUrl}/create/${contractName}/${secretKey}`
    }
    /********************************
    Get Contract Helper
    ********************************/
    async function getContract(viewMethods = [], changeMethods = [], secretKey) {
        if (secretKey) {
            await window.keyStore.setKey(
                NETWORK_ID, contractName,
                nearApi.KeyPair.fromString(secretKey)
            )
        }
        const contract = new nearApi.Contract(window.contractAccount, contractName, {
            viewMethods,
            changeMethods,
            sender: contractName
        })
        return contract
    }
    /********************************
    Funding an open drop (claim, create account, create contract) with your currently logged in account
    ********************************/
    async function fundDrop() {
        // get a drop amount from the user
        const amount = toNear(window.prompt('Amount to fund with in Near Ⓝ') || 0)
        // TODO: What is minimum allowance? Seems to not match what is in contract source?
        if (nearToInt(amount) < 1) {
            window.alert('Amount too small for drop')
            return
        }
        // create a new drop keypair, add the amount to the object, store it
        const newKeyPair = nearApi.KeyPair.fromRandom('ed25519')
        const public_key = newKeyPair.public_key = newKeyPair.publicKey.toString().replace('ed25519:', '')
        newKeyPair.amount = amount
        await addDrop(newKeyPair)
        // register the drop public key and send the amount to contract
        const { contract } = window
        try {
            await contract.send({ public_key }, DROP_GAS, amount)
        } catch(e) {
            removeDrop(public_key)
            console.warn(e)
        }
    }
    /********************************
    Reclaim a drop / cancels the drop and claims to the current user
    ********************************/
    async function reclaimDrop(public_key) {
        // get the drops from idb and find the one matching this public key
        const drops = await get(dropStorageKey) || []
        const drop = drops.find((d) => d.public_key === public_key)
        if (!window.confirm(`Remove drop of ${nearTo(drop.amount, 2)} Ⓝ and transfer funds to\n${account_id}\nDo you want to continue?`)) {
            return
        }
        const contract = await getContract([], ['claim'], drop.secretKey)
        // return funds to current user
        await contract.claim({ account_id }, BOATLOAD_OF_GAS)
            .then(() => {
                window.alert('Drop claimed')
            })
            .catch((e) => {
                console.log(e)
                alert('Unable to claim drop. The drop may have already been claimed.')
            })
        removeDrop(public_key)
        updateUser()
    }

    const activeDrops = drops.filter((d) => !d.used)
    const usedDrops = drops.filter((d) => d.used)

    console.log('ACTIVE DROPS', activeDrops)

    return (
        <div className="root">
            <div>
                <p>{account_id}</p>
                <p>Balance: <span className="funds">{nearTo(currentUser.balance, 2)} Ⓝ</span></p>
            </div>
            <button onClick={() => fundDrop()}>Create New NEAR Drop</button><br/>
            {
                urlDrop && <div className="drop">
                    <h2>URL Drop</h2>
                    <p className="funds">{nearTo(urlDrop.amount, 2)} Ⓝ</p>
                    <p>From: {urlDrop.from}</p>
                    { urlDrop.limited ?
                        <button onClick={() => claimMultisig(urlDrop.amount, urlDrop.key)}>Create Multisig</button>
                        :
                        <>
                        <button onClick={() => claimDrop(urlDrop.amount, urlDrop.key)}>Claim Drop</button>
                        <button onClick={() => claimAccount(urlDrop.amount, urlDrop.key)}>Create Account</button>
                        <button onClick={() => claimContract(urlDrop.amount, urlDrop.key)}>Create Multisig</button>
                        </>
                    }
                </div>
            }
            { activeDrops.length > 0 && 
                <div className="drop">
                    <h2>Active Drops</h2>
                    {
                        activeDrops.map(({ public_key, amount, walletLink }) => <div className="drop" key={public_key}>
                            <p className="funds">{nearTo(amount, 2)} Ⓝ</p>
                            <p>For public key: {public_key.substring(0, 5)+'...'}</p>
                            <button onClick={async () => {
                                await clipboard.writeText(walletLink)
                                alert('Create Near Wallet link copied to clipboard')
                            }}>Copy Near Wallet Link</button>
                            <br/>

                            <button onClick={() => reclaimDrop(public_key)}>Remove Drop</button>
                        </div>)
                    }
                </div>
            }
            { showUsed ?
                <>
                    <div className="drop">
                        <button style={{width: '100%', marginTop: 16}} onClick={() => setShowUsed(false)}>Hide Used Drops</button>
                    </div>
                    {
                        usedDrops.length > 0 ? 
                        <div className="drop">
                        <h3>Used Drops</h3>
                        {
                            usedDrops.map(({ public_key, amount, walletLink }) => <div className="drop" key={public_key}>
                                <p className="funds">{nearTo(amount, 2)} Ⓝ</p>
                                <p>For public key: {public_key.substring(0, 5)+'...'}</p>
                                <button onClick={async () => {
                                    await clipboard.writeText(walletLink)
                                    alert('Create Near Wallet link copied to clipboard')
                                }}>Copy Near Wallet Link</button>
                                <br/>

                                <button onClick={() => reclaimDrop(public_key)}>Remove Drop</button>
                            </div>)
                        }
                        </div> : <h3>No Used Drops</h3>
                    }
                </>
                :
                <button onClick={() => setShowUsed(true)}>Show Used Drops</button>
            }
        </div>
    )
}

export default Drops;
