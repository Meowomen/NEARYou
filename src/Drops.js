import 'regenerator-runtime/runtime';
import React, { useState, useEffect } from 'react';
import * as nearApi from 'near-api-js';
import * as clipboard from 'clipboard-polyfill/text';
import { nearTo, toNear, BOATLOAD_OF_GAS, NETWORK_ID, getNewKeyPair } from './util/near-util';
import './Drops.scss';
import { get, set, downloadKeyFile } from './util/util';
import { fetchNftList } from './apis/index';

const Drops = (props) => {
  const { contractName, nftContractName, walletUrl } = window.nearConfig;

  const {
    currentUser,
    currentUser: { account_id },
    updateUser,
  } = props;

  let accountId = account_id;
  if (!accountId || accountId.length === 0) {
    accountId = window.prompt('Your AccountId?');
  }
  const dropStorageKey = '__drops_' + accountId;
  const minimumGasFee = 1.2;

  const [secretKey, setSecretKey] = useState('');
  const [nfts, setNfts] = useState();
  const [drops, setDrops] = useState([]);

  useEffect(() => {
    updateDrops();
  }, []);

  useEffect(() => {
    fetchNFTs();
  }, [drops]);

  function onChangeInputSecretKey(e) {
    setSecretKey(e.target.value);
  }

  async function fetchNFTs() {
    const AllNftList = await fetchNftList(nftContractName);
    setNfts(await filterNFTList(AllNftList, drops));
  }

  async function filterNFTList(AllNftList, drops) {
    const nftList = [];

    for (let nft of AllNftList) {
      if (nft.owner_id === account_id) {
        for (let drop of drops) {
          if (nft.token_id === drop.nft_id) {
            nft.walletLink = await getWalletLink(drop.public_key);
          }
        }
        nftList.push(nft);
      }
    }

    return nftList;
  }

  async function approveUser(nft_id) {
    const account = (window.account = window.walletConnection.account());
    const nftContract = await new nearApi.Contract(account, nftContractName, {
      viewMethods: ['get_key_balance'],
      changeMethods: ['nft_approve'],
      sender: window.currentUser.accountId,
    });

    try {
      const amount = toNear(minimumGasFee);
      await nftContract.nft_approve({ token_id: nft_id, account_id: contractName }, BOATLOAD_OF_GAS, amount);
    } catch (e) {
      console.warn(e);
    }
  }

  async function fundDropNft(nft_id) {
    const newKeyPair = getNewKeyPair();
    const public_key = (newKeyPair.public_key = newKeyPair.publicKey.toString().replace('ed25519:', ''));

    downloadKeyFile(public_key, newKeyPair);

    newKeyPair.nft_id = nft_id;
    newKeyPair.ts = Date.now();
    await addDrop(newKeyPair);

    const { contract } = window;
    try {
      const amount = toNear(minimumGasFee);
      await contract.send({ public_key: public_key, nft_id: nft_id }, BOATLOAD_OF_GAS, amount);
    } catch (e) {
      console.warn(e);
    }
  }

  async function onClickClaimNFT() {
    const contract = await getContract([], ['claim'], secretKey);

    await contract
      .claim({ account_id }, BOATLOAD_OF_GAS)
      .then(() => {
        window.alert('Drop claimed');
      })
      .catch((e) => {
        console.log(e);
        alert('Unable to claim drop. The drop may have already been claimed.');
      });
  }

  async function getContract(viewMethods = [], changeMethods = [], secretKey) {
    if (secretKey) {
      await window.keyStore.setKey(NETWORK_ID, contractName, nearApi.KeyPair.fromString(secretKey));
    }
    const contract = new nearApi.Contract(window.contractAccount, contractName, {
      viewMethods,
      changeMethods,
      sender: contractName,
    });
    return contract;
  }

  async function getWalletLink(public_key) {
    const { secretKey } = await getDrop(public_key);
    return `${walletUrl}/create/${contractName}/${secretKey}`;
  }

  async function getDrop(public_key) {
    const drops = (await get(dropStorageKey)) || [];
    return drops.find((d) => d.public_key === public_key);
  }

  async function useDrop(public_key) {
    const drops = (await get(dropStorageKey)) || [];
    const drop = drops.find((d) => d.public_key === public_key);
    drop.used = true;
    await set(dropStorageKey, drops);
    updateDrops();
  }

  async function addDrop(newKeyPair) {
    const drops = (await get(dropStorageKey)) || [];
    drops.push(newKeyPair);
    await set(dropStorageKey, drops);
    updateDrops();
  }

  async function updateDrops() {
    const drops = (await get(dropStorageKey)) || [];
    for (let drop of drops) {
      const { public_key: key } = drop;
      drop.walletLink = await getWalletLink(key);
    }
    setDrops(drops);
  }

  return (
    <div className="root">
      <div>
        <p>{accountId}</p>
        <p>
          Balance: <span className="funds">{nearTo(currentUser.balance, 2)} Ⓝ</span>
        </p>
      </div>
      <div>
        <p>{secretKey}</p>
        <input type="text" onChange={onChangeInputSecretKey} />
        <button type="button" onClick={onClickClaimNFT}>
          Claim
        </button>
      </div>
      <div className="nft">
        <h2>My NFTs</h2>
        {nfts &&
          Object.keys(nfts).map((k) => {
            return (
              <div key={nfts[k].token_id}>
                <div>
                  <img className="nft-image" src={nfts[k].metadata.media} />
                </div>
                <p>
                  NFT #{parseInt(k) + 1}: [token id] {nfts[k].token_id} [title] {nfts[k].metadata.title}
                </p>
                <button onClick={() => approveUser(nfts[k].token_id)}>Approve</button>
                <button onClick={() => fundDropNft(nfts[k].token_id)}>Drop</button>
                {nfts[k].walletLink && (
                  <button
                    onClick={async () => {
                      await clipboard.writeText(nfts[k].walletLink);
                      alert('Create Near Wallet link copied to clipboard');
                    }}
                  >
                    Copy Near Wallet Link
                  </button>
                )}
              </div>
            );
          })}
      </div>
    </div>
  );
};

export default Drops;
