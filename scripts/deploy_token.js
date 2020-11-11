const bre = require("@nomiclabs/buidler");
const {deployments, getNamedAccounts} = bre;

const rlp = require("rlp");

const {
  TASK_FLATTEN_GET_FLATTENED_SOURCE,
} = require("@nomiclabs/buidler/builtin-tasks/task-names");
const {expect} = require("chai");

let owner;

const GAS_PRICE = ethers.utils.parseUnits("90.0", "gwei"); //Gwei

async function main() {
  [owner, multisig, ...addrs] = await ethers.getSigners();
  //let flattenedSource = await bre.run(TASK_FLATTEN_GET_FLATTENED_SOURCE);

  console.log("\n#######################");
  console.log("##### Deployments #####");
  console.log("#######################");

  // HEZ Token
  const Token = await ethers.getContractFactory("HEZ");
  const token = await Token.deploy("0xF35960302a07022aBa880DFFaEC2Fdd64d5BF1c1", {
    gasPrice: GAS_PRICE,
  });

  await token.deployed();

  console.log(token.address);

}

function sleep(ms) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
