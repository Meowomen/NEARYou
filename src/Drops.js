import 'regenerator-runtime/runtime';
import React, { useState, useEffect } from 'react';
import * as nearApi from 'near-api-js';
import { nearTo, nearToInt, toNear, BOATLOAD_OF_GAS, DROP_GAS, NETWORK_ID, ACCESS_KEY_ALLOWANCE } from './util/near-util';
import './Drops.scss';
import { decode } from 'bs58';
import { downloadFile } from './util';

const Drops = (props) => {
  const { contractName, walletUrl } = window.nearConfig;

  const {
    currentUser,
    currentUser: { account_id },
    updateUser,
  } = props;

  let accountId = account_id;
  if (!accountId || accountId.length === 0) {
    accountId = window.prompt('Your AccountId?');
  }

  /********************************
    Get Contract Helper
    ********************************/
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

  function onChangeInputSecretKey(e) {
    setSecretKey(e.target.value);
  }

  const [secretKey, setSecretKey] = useState('');
  const [nfts, setNfts] = useState();

  async function onClickClaimNFT() {
    const nft_contract_id = 'sender_test.testnet';
    const contract = await getContract([], ['claim_nft'], secretKey);

    await contract
      .claim_nft({ account_id, nft_contract_id, key_pair_id: account_id, approval_id: '1' }, BOATLOAD_OF_GAS)
      .then(() => {
        window.alert('Drop claimed');
      })
      .catch((e) => {
        console.log(e);
        alert('Unable to claim drop. The drop may have already been claimed.');
      });
  }

  useEffect(async () => {
    const helperUrl = `https://helper.nearapi.org/v1/batch/[{"contract":"mint-test.testnet","method":"nft_tokens","args":{},"batch":{"from_index":"0","step":"50","flatten":[]},"sort":{"path":"metadata.issued_at"}}]`;
    const lists = await fetch(helperUrl).then((res) => res.json());
    const nftList = lists[0];
    setNfts(nftList.filter((nft) => nft.owner_id === accountId));
  }, []);

  async function fundDropNft(nft_id) {
    const newKeyPair = nearApi.KeyPair.fromRandom('ed25519');
    const public_key = (newKeyPair.public_key = newKeyPair.publicKey.toString().replace('ed25519:', ''));

    const downloadKey = window.confirm('Download keypair before funding?');
    if (downloadKey) {
      const { secretKey, public_key: publicKey } = JSON.parse(JSON.stringify(newKeyPair));
      downloadFile(public_key + '.txt', JSON.stringify({ publicKey, secretKey }));
    }

    newKeyPair.nft_id = nft_id;
    newKeyPair.ts = Date.now();

    const { contract } = window;
    const newKeyPairId = decode(public_key).toString('hex');
    try {
      const amount = toNear(1.2);
      await contract.send_nft(
        { public_key, token_id: nft_id, sender_id: 'sender_test.testnet', key_pair_id: newKeyPairId },
        DROP_GAS,
        amount
      );
    } catch (e) {
      console.warn(e);
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
              <div>
                <p>
                  NFT #{parseInt(k) + 1}: [token id] {nfts[k].token_id} [title] {nfts[k].metadata.title}
                </p>
                <button onClick={() => fundDropNft(nfts[k].token_id)}>Create NFT #{nfts[k].token_id} Drop</button>
              </div>
            );
          })}
      </div>
    </div>
  );
};

export default Drops;
