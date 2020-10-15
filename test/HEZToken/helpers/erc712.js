const { ethers } = require("@nomiclabs/buidler");

function createDomainSeparator(name, version, chainId, verifyingContract) {
  return ethers.utils.keccak256(
    ethers.utils.defaultAbiCoder.encode(
      ["bytes32", "bytes32", "bytes32", "uint256", "address"],
      [
        ethers.utils.keccak256(
          ethers.utils.toUtf8Bytes(
            "EIP712Domain(string name,string version,uint256 chainId,address verifyingContract)"
          )
        ),
        ethers.utils.keccak256(ethers.utils.toUtf8Bytes(name)),
        ethers.utils.keccak256(ethers.utils.toUtf8Bytes(version)),
        chainId,
        verifyingContract,
      ]
    )
  );
}

module.exports = {
  createDomainSeparator,
};
