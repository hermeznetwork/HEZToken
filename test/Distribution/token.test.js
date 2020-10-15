const {
  ethers
} = require("@nomiclabs/buidler");

const {
  expect
} = require("chai");

const rlp = require("rlp");

const VESTING_ADDRESS = 4;

let bootstrapDistribution;
describe("HEZ", function() {
  beforeEach(async function() {
    [
      owner,
      ...addrs
    ] = await ethers.getSigners();

    let ownerAddress = await owner.getAddress();

    let transactionCount = (await owner.getTransactionCount());

    console.log("Owner Address: " + ownerAddress);

    for (i = 0; i < VESTING_ADDRESS; i++) {
      var contract_address = ethers.utils
        .keccak256(rlp.encode([await owner.getAddress(), transactionCount]))
        .substring(26);
      console.log("Address Vesting " + i + ": 0x" + contract_address);
      transactionCount++;
    }

    var bootstrapAddress = ethers.utils
      .keccak256(rlp.encode([await owner.getAddress(), transactionCount]))
      .substring(26);
    console.log("Address BootstrapDistribution" + i + ": 0x" + bootstrapAddress);
    transactionCount++;

    var tokenAddress = ethers.utils
      .keccak256(rlp.encode([await owner.getAddress(), transactionCount]))
      .substring(26);

    console.log("Address HEZ Token " + i + ": 0x" + tokenAddress);


    let vestingVaultFactory = await ethers.getContractFactory("VestingVault");
    // Vesting Founders
    let vestingVault0 = await vestingVaultFactory.deploy(
      tokenAddress,
      bootstrapAddress,
      false
    );
    await vestingVault0.deployed();
    console.log("Vesting Founders (0):\t\t", vestingVault0.address);

    // Vesting Development
    let vestingVault1 = await vestingVaultFactory.deploy(
      tokenAddress,
      bootstrapAddress,
      false
    );
    await vestingVault1.deployed();
    console.log("Vesting Development (1):\t", vestingVault1.address);

    // Vesting Stakeholders
    let vestingVault2 = await vestingVaultFactory.deploy(
      tokenAddress,
      bootstrapAddress,
      true
    );
    await vestingVault2.deployed();
    console.log("Vesting Stakeholders (2):\t", vestingVault2.address);

    // Vesting Exchanges
    let vestingVault3 = await vestingVaultFactory.deploy(
      tokenAddress,
      bootstrapAddress,
      true
    );
    await vestingVault3.deployed();
    console.log("Vesting Exchanges (3):\t\t", vestingVault3.address);

    // Bootstrap Distribution
    let bootstrapDistributionFactory = await ethers.getContractFactory("BootstrapDistribution");
    bootstrapDistribution = await bootstrapDistributionFactory.deploy();
    await bootstrapDistribution.deployed();
    console.log("Bootstrap Distribution (3):\t", bootstrapDistribution.address);

    // HEZ Token
    const Token = await ethers.getContractFactory("HEZ");
    const token = await Token.deploy(
      bootstrapDistribution.address
    );
    await token.deployed();
    
    console.log("HEZ Token address:\t\t", token.address);
    console.log("Bootstrap Distribution Balance:\t\t",(await token.balanceOf(bootstrapDistribution.address)).toString())
  });

  it("set up the token correctly", async () => {
    await bootstrapDistribution.distribute();
  });
});