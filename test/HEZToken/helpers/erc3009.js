const {
    ethers
} = require("@nomiclabs/buidler");
const TRANSFER_WITH_AUTHORIZATION_TYPEHASH = ethers.utils.keccak256(ethers.utils.toUtf8Bytes('TransferWithAuthorization(address from,address to,uint256 value,uint256 validAfter,uint256 validBefore,bytes32 nonce)'));
async function createTransferWithAuthorizationDigest(token, from, to, value, validAfter, validBefore, nonce) {
    const chainId = (await token.getChainId());
    const name = await token.name();

    let _domainSeparator = ethers.utils.keccak256(
        ethers.utils.defaultAbiCoder.encode(
          ["bytes32", "bytes32", "bytes32", "uint256", "address"],
          [
            ethers.utils.keccak256(
              ethers.utils.toUtf8Bytes(
                "EIP712Domain(string name,string version,uint256 chainId,address verifyingContract)"
              )
            ),
            ethers.utils.keccak256(ethers.utils.toUtf8Bytes(name)),
            ethers.utils.keccak256(ethers.utils.toUtf8Bytes("1")),
            chainId,
            token.address,
          ]
        )
      );

    return ethers.utils.solidityKeccak256(
        ['bytes1', 'bytes1', 'bytes32', 'bytes32'],
        [
            '0x19',
            '0x01',
            _domainSeparator,
            ethers.utils.keccak256(ethers.utils.defaultAbiCoder.encode(
                ['bytes32', 'address', 'address', 'uint256', 'uint256', 'uint256', 'bytes32'],
                [TRANSFER_WITH_AUTHORIZATION_TYPEHASH, from, to, value, validAfter, validBefore, nonce]
            ))
        ]);
}

module.exports = {
    createTransferWithAuthorizationDigest,
    TRANSFER_WITH_AUTHORIZATION_TYPEHASH
}