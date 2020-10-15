const bre = require("@nomiclabs/buidler");
const {deployments, getNamedAccounts} = bre;

const rlp = require("rlp");

const {
  TASK_FLATTEN_GET_FLATTENED_SOURCE,
} = require("@nomiclabs/buidler/builtin-tasks/task-names");
const {expect} = require("chai");

let owner;

const SecurityMultiSig = "0xF96A39d61F6972d8dC0CCd2A3c082eD922E096a7";
const CommunityMultiSig = "0x99Ae889E171B82BB04FD22E254024716932e5F2f";
const PromotionMultiSig = "0x4D4a7675CC0eb0a3B1d81CbDcd828c4BD0D74155";
const LegalMultiSig = "0x9315F815002d472A3E993ac9dc7461f2601A3c09";
const MarketMultiSig = "0x9CdaeBd2bcEED9EB05a3B3cccd601A40CB0026be";
const OperationalMultiSig = "0xA93Bb239509D16827B7ee9DA7dA6Fc8478837247";

const GAS_PRICE = ethers.utils.parseUnits("90.0", "gwei"); //Gwei

async function main() {
  [owner, multisig, ...addrs] = await ethers.getSigners();
  let ownerAddress = await owner.getAddress();
  //let flattenedSource = await bre.run(TASK_FLATTEN_GET_FLATTENED_SOURCE);

  let transactionCount = await owner.getTransactionCount();
  console.log("\n##### Deployed Address #####");
  console.log("Owner Address: " + ownerAddress);
  console.log("\n############################");
  console.log("##### Computed Address #####");
  console.log("############################");
  var computedVestingAddress0 = ethers.utils
    .keccak256(rlp.encode([await owner.getAddress(), transactionCount]))
    .substring(26);
  console.log(
    "Vesting 0: " + ethers.utils.getAddress("0x" + computedVestingAddress0)
  );
  transactionCount++;

  var computedVestingAddress1 = ethers.utils
    .keccak256(rlp.encode([await owner.getAddress(), transactionCount]))
    .substring(26);
  console.log(
    "Vesting 1: " + ethers.utils.getAddress("0x" + computedVestingAddress1)
  );
  transactionCount++;

  var computedVestingAddress2 = ethers.utils
    .keccak256(rlp.encode([await owner.getAddress(), transactionCount]))
    .substring(26);
  console.log(
    "Vesting 2: " + ethers.utils.getAddress("0x" + computedVestingAddress2)
  );
  transactionCount++;

  var computedVestingAddress3 = ethers.utils
    .keccak256(rlp.encode([await owner.getAddress(), transactionCount]))
    .substring(26);
  console.log(
    "Vesting 3: " + ethers.utils.getAddress("0x" + computedVestingAddress3)
  );
  transactionCount++;

  var bootstrapAddress = ethers.utils
    .keccak256(rlp.encode([await owner.getAddress(), transactionCount]))
    .substring(26);
  console.log(
    "Address BootstrapDistribution: " +
      ethers.utils.getAddress("0x" + bootstrapAddress)
  );
  transactionCount++;

  var tokenAddress = ethers.utils
    .keccak256(rlp.encode([await owner.getAddress(), transactionCount]))
    .substring(26);

  console.log(
    "Address HEZ Token: " + ethers.utils.getAddress("0x" + tokenAddress)
  );

  console.log("\n#######################");
  console.log("##### Deployments #####");
  console.log("#######################");

  const now = (await ethers.provider.getBlock()).timestamp;
  const CLIFF_TIER_1 = 180 * (3600 * 24);
  const DURATION_TIER_1 = 1095 * (3600 * 24);
  const INITIAL_PERCENTAGE_TIER_1 = 5;
  const CLIFF_TIER_2 = 180 * (3600 * 24);
  const DURATION_TIER_2 = 730 * (3600 * 24);
  const INITIAL_PERCENTAGE_TIER_2 = 10;

  let vestingVaultFactory = await ethers.getContractFactory("HermezVesting");
  // Vesting Founders
  let vestingVault0 = await vestingVaultFactory.deploy(
    bootstrapAddress,
    ethers.utils.parseEther("20000000"),
    now,
    CLIFF_TIER_1,
    DURATION_TIER_1,
    INITIAL_PERCENTAGE_TIER_1,
    {
      gasPrice: GAS_PRICE,
    }
  );
  await vestingVault0.deployed();
  console.log(
    "Vesting Founders (0):\t\t",
    vestingVault0.address,
    " ",
    vestingVault0.deployTransaction.hash
  );

  // Vesting Development
  let vestingVault1 = await vestingVaultFactory.deploy(
    bootstrapAddress,
    ethers.utils.parseEther("10000000"),
    now,
    CLIFF_TIER_1,
    DURATION_TIER_1,
    INITIAL_PERCENTAGE_TIER_1,
    {
      gasPrice: GAS_PRICE,
    }
  );
  await vestingVault1.deployed();
  console.log(
    "Vesting Development (1):\t",
    vestingVault1.address,
    " ",
    vestingVault1.deployTransaction.hash
  );

  // Vesting Stakeholders
  let vestingVault2 = await vestingVaultFactory.deploy(
    bootstrapAddress,
    ethers.utils.parseEther("6200000"),
    now,
    CLIFF_TIER_1,
    DURATION_TIER_1,
    INITIAL_PERCENTAGE_TIER_1,
    {
      gasPrice: GAS_PRICE,
    }
  );
  await vestingVault2.deployed();
  console.log(
    "Vesting Stakeholders (2):\t",
    vestingVault2.address,
    " ",
    vestingVault2.deployTransaction.hash
  );

  // Vesting Others
  let vestingVault3 = await vestingVaultFactory.deploy(
    bootstrapAddress,
    ethers.utils.parseEther("17500000"),
    now,
    CLIFF_TIER_2,
    DURATION_TIER_2,
    INITIAL_PERCENTAGE_TIER_2,
    {
      gasPrice: GAS_PRICE,
    }
  );
  await vestingVault3.deployed();
  console.log(
    "Vesting Others (3):\t\t",
    vestingVault3.address,
    " ",
    vestingVault3.deployTransaction.hash
  );

  // Bootstrap Distribution
  let bootstrapDistributionFactory = await ethers.getContractFactory(
    "BootstrapDistribution"
  );
  let bootstrapDistribution = await bootstrapDistributionFactory.deploy({
    gasPrice: GAS_PRICE,
  });
  await bootstrapDistribution.deployed();
  console.log(
    "Bootstrap Distribution (3):\t",
    bootstrapDistribution.address,
    " ",
    bootstrapDistribution.deployTransaction.hash
  );

  // HEZ Token
  const Token = await ethers.getContractFactory("HEZ");
  const token = await Token.deploy(bootstrapDistribution.address, {
    gasPrice: GAS_PRICE,
  });
  await token.deployed();
  console.log(
    "HEZ Token address:\t\t",
    token.address,
    " ",
    token.deployTransaction.hash
  );

  await bootstrapDistribution.distribute({
    gasPrice: GAS_PRICE,
  });

  console.log("\nWaiting for deployment...");
  sleep(300000);

  let balanceVesting0 = await token.balanceOf(vestingVault0.address);
  let balanceVesting1 = await token.balanceOf(vestingVault1.address);
  let balanceVesting2 = await token.balanceOf(vestingVault2.address);
  let balanceVesting3 = await token.balanceOf(vestingVault3.address);

  let balancePromotionMultiSig = await token.balanceOf(PromotionMultiSig);
  let balanceMarketMultiSig = await token.balanceOf(MarketMultiSig);
  let balanceLegalMultiSig = await token.balanceOf(LegalMultiSig);
  let balanceSecurityMultiSig = await token.balanceOf(SecurityMultiSig);
  let balanceOperationalMultiSig = await token.balanceOf(OperationalMultiSig);
  let balanceCommunityMultiSig = await token.balanceOf(CommunityMultiSig);

  console.log("\n##################");
  console.log("##### Checks #####");
  console.log("##################");
  console.log(
    "Address Vesting 0\t=> Balance: ",
    ethers.utils.formatEther(balanceVesting0) +
      "\tAddress: " +
      vestingVault0.address
  );
  console.log(
    "Address Vesting 1\t=> Balance: ",
    ethers.utils.formatEther(balanceVesting1) +
      "\tAddress: " +
      vestingVault1.address
  );
  console.log(
    "Address Vesting 2\t=> Balance: ",
    ethers.utils.formatEther(balanceVesting2) +
      "\tAddress: " +
      vestingVault2.address
  );
  console.log(
    "Address Vesting 3\t=> Balance: ",
    ethers.utils.formatEther(balanceVesting3) +
      "\tAddress: " +
      vestingVault3.address
  );

  console.log(
    "Address Vesting 3\t=> Balance: ",
    ethers.utils.formatEther(balanceVesting3) +
      "\tAddress: " +
      vestingVault3.address
  );

  console.log(
    "Address Security\t=> Balance: ",
    ethers.utils.formatEther(balanceSecurityMultiSig) +
      "\tAddress: " +
      SecurityMultiSig
  );

  console.log(
    "Address Community\t=> Balance: ",
    ethers.utils.formatEther(balanceCommunityMultiSig) +
      "\tAddress: " +
      CommunityMultiSig
  );

  console.log(
    "Address Promotion\t=> Balance: ",
    ethers.utils.formatEther(balancePromotionMultiSig) +
      "\tAddress: " +
      PromotionMultiSig
  );

  console.log(
    "Address Legal\t\t=> Balance: ",
    ethers.utils.formatEther(balanceLegalMultiSig) +
      "\tAddress: " +
      LegalMultiSig
  );

  console.log(
    "Address Market\t\t=> Balance: ",
    ethers.utils.formatEther(balanceMarketMultiSig) +
      "\tAddress: " +
      MarketMultiSig
  );

  console.log(
    "Address Operational\t=> Balance: ",
    ethers.utils.formatEther(balanceOperationalMultiSig) +
      "\tAddress: " +
      OperationalMultiSig
  );

  expect(vestingVault0.address.toLowerCase()).to.be.equal(
    "0x" + computedVestingAddress0
  );
  expect(vestingVault1.address.toLowerCase()).to.be.equal(
    "0x" + computedVestingAddress1
  );
  expect(vestingVault2.address.toLowerCase()).to.be.equal(
    "0x" + computedVestingAddress2
  );
  expect(vestingVault3.address.toLowerCase()).to.be.equal(
    "0x" + computedVestingAddress3
  );

  // Check balances
  expect(balanceVesting0).to.be.equal(ethers.utils.parseEther("20000000"));
  expect(balanceVesting1).to.be.equal(ethers.utils.parseEther("10000000"));
  expect(balanceVesting2).to.be.equal(ethers.utils.parseEther("6200000"));
  expect(balanceVesting3).to.be.equal(ethers.utils.parseEther("17500000"));

  expect(balancePromotionMultiSig).to.be.equal(
    ethers.utils.parseEther("19000000")
  );
  expect(balanceMarketMultiSig).to.be.equal(ethers.utils.parseEther("9000000"));
  expect(balanceLegalMultiSig).to.be.equal(ethers.utils.parseEther("7500000"));
  expect(balanceSecurityMultiSig).to.be.equal(
    ethers.utils.parseEther("5000000")
  );
  expect(balanceOperationalMultiSig).to.be.equal(
    ethers.utils.parseEther("3000000")
  );
  expect(balanceCommunityMultiSig).to.be.equal(
    ethers.utils.parseEther("2800000")
  );
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
