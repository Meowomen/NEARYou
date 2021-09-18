import 'regenerator-runtime/runtime';
import React, { useState, useEffect } from 'react';
import * as nearApi from 'near-api-js';
import { nearTo, nearToInt, toNear, BOATLOAD_OF_GAS, DROP_GAS, NETWORK_ID, ACCESS_KEY_ALLOWANCE } from './util/near-util';
import './Drops.scss';
import { downloadFile } from './util';

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

  useEffect(() => {
    fetchNFTs();
  }, []);

  const [secretKey, setSecretKey] = useState('');
  const [nfts, setNfts] = useState();

  function onChangeInputSecretKey(e) {
    setSecretKey(e.target.value);
  }

  async function fetchNFTs() {
    const helperUrl = `https://helper.nearapi.org/v1/batch/[{"contract":"${nftContractName}","method":"nft_tokens","args":{},"batch":{"from_index":"0","step":"50","flatten":[]},"sort":{"path":"metadata.issued_at"}}]`;
    const lists = await fetch(helperUrl).then((res) => res.json());
    const nftList = lists[0];
    setNfts(nftList.filter((nft) => nft.owner_id === accountId));
  }

  async function approveUser(nft_id) {
    const account = (window.account = window.walletConnection.account());
    const nftContract = await new nearApi.Contract(account, nftContractName, {
      viewMethods: ['get_key_balance'],
      changeMethods: ['nft_approve'],
      sender: window.currentUser.accountId,
    });

    try {
      const amount = toNear(1.2);
      await nftContract.nft_approve({ token_id: nft_id, account_id: contractName }, BOATLOAD_OF_GAS, amount);
    } catch (e) {
      console.warn(e);
    }
  }

  async function fundDropNft(nft_id) {
    const newKeyPair = nearApi.KeyPair.fromRandom('ed25519');
    const public_key = (newKeyPair.public_key = newKeyPair.publicKey.toString().replace('ed25519:', ''));

    downloadKeyFile(public_key, newKeyPair);

    const { contract } = window;
    try {
      const amount = toNear(1.2);
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

  function downloadKeyFile(public_key, newKeyPair) {
    const downloadKey = window.confirm('Download keypair before funding?');
    if (downloadKey) {
      const { secretKey, public_key: publicKey } = JSON.parse(JSON.stringify(newKeyPair));
      downloadFile(public_key + '.txt', JSON.stringify({ publicKey, secretKey }));
    }
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
                <p>
                  NFT #{parseInt(k) + 1}: [token id] {nfts[k].token_id} [title] {nfts[k].metadata.title}
                </p>
                <button onClick={() => approveUser(nfts[k].token_id)}>Approve</button>
                <button onClick={() => fundDropNft(nfts[k].token_id)}>Create NFT #{nfts[k].token_id} Drop</button>
              </div>
            );
          })}
      </div>
    </div>
  );
};

export default Drops;
