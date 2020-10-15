const { ethers } = require("@nomiclabs/buidler");

let vestingVaultFactory,
  vestingVault,
  tokenFactory,
  token,
  multisig,
  multisig2,
  multisig3,
  recipient,
  recipient2;
let multisigAddress,
  multisig2Address,
  multisig3Address,
  recipientAddress,
  recipient2Address;
let secondsPerDay = 86400;
const { expect } = require("chai");

describe("VestingVault revocable", function () {
  beforeEach(async function () {
    [
      multisig,
      multisig2,
      multisig3,
      recipient,
      recipient2,
      ...addrs
    ] = await ethers.getSigners();

    multisigAddress = await multisig.getAddress();
    multisig2Address = await multisig2.getAddress();
    multisig3Address = await multisig3.getAddress();
    recipientAddress = await recipient.getAddress();
    recipient2Address = await recipient2.getAddress();

    let chainId = (await ethers.provider.getNetwork()).chainId;
    tokenFactory = await ethers.getContractFactory("HEZ");
    token = await tokenFactory.deploy(multisigAddress);
    await token.deployed();

    vestingVaultFactory = await ethers.getContractFactory("VestingVault");
    vestingVault = await vestingVaultFactory.deploy(
      token.address,
      multisigAddress,
      true
    );
    await vestingVault.deployed();
    await token.approve(vestingVault.address, ethers.constants.MaxUint256);
    await token.approve(vestingVault.address, ethers.constants.MaxUint256);
    await token.transfer(multisig2Address, ethers.utils.parseEther("500"));
    await token
      .connect(multisig2)
      .approve(vestingVault.address, ethers.constants.MaxUint256);
    await token.transfer(multisig3Address, ethers.utils.parseEther("500"));
  });

  it("set up the token correctly", async () => {
    expect(await vestingVault.token()).to.be.equal(token.address);
    expect(await vestingVault.revocable()).to.be.equal(true);
    expect(await vestingVault.multiSig()).to.be.equal(multisigAddress);
  });

  it("should add token grant", async () => {
    const now = (await ethers.provider.getBlock()).timestamp;
    const vestingDurationInDays = 365;
    const vestingCliffInDays = 180;
    let totalVestingCount = await vestingVault.totalVestingCount();
    await expect(
      vestingVault.addTokenGrant(
        recipientAddress,
        now,
        ethers.utils.parseEther("100"),
        vestingDurationInDays,
        vestingCliffInDays
      )
    )
      .to.emit(vestingVault, "GrantAdded")
      .withArgs(recipientAddress, totalVestingCount);
  });

  it("shouldn't add token grant more than 10 years cliff", async () => {
    const now = (await ethers.provider.getBlock()).timestamp;
    let totalVestingCount = await vestingVault.totalVestingCount();
    const vestingDurationInDays = 365 * 20 + 1;
    const vestingCliffInDays = 365 * 10 + 1;
    await expect(
      vestingVault.addTokenGrant(
        recipientAddress,
        now,
        ethers.utils.parseEther("100"),
        vestingDurationInDays,
        vestingCliffInDays
      )
    ).to.be.revertedWith("more than 10 years");
  });

  it("shouldn't add token grant more than 25 years vesting", async () => {
    const now = (await ethers.provider.getBlock()).timestamp;
    let totalVestingCount = await vestingVault.totalVestingCount();
    const vestingDurationInDays = 365 * 25 + 1;
    const vestingCliffInDays = 180 + 1;
    await expect(
      vestingVault.addTokenGrant(
        recipientAddress,
        now,
        ethers.utils.parseEther("100"),
        vestingDurationInDays,
        vestingCliffInDays
      )
    ).to.be.revertedWith("more than 25 years");
  });

  it("shouldn't add token grant if Duration < Cliff", async () => {
    const now = (await ethers.provider.getBlock()).timestamp;
    let totalVestingCount = await vestingVault.totalVestingCount();
    const vestingCliffInDays = 365 + 1;
    const vestingDurationInDays = 180 + 1;

    await expect(
      vestingVault.addTokenGrant(
        recipientAddress,
        now,
        ethers.utils.parseEther("100"),
        vestingDurationInDays,
        vestingCliffInDays
      )
    ).to.be.revertedWith("Duration < Cliff");
  });

  it("should revert if not enough allowance", async () => {
    const now = (await ethers.provider.getBlock()).timestamp;
    let totalVestingCount = await vestingVault.totalVestingCount();
    const vestingDurationInDays = 365;
    const vestingCliffInDays = 180;
    vestingVault.changeMultiSig(multisig3Address);

    await expect(
      vestingVault
        .connect(multisig3)
        .addTokenGrant(
          recipientAddress,
          now,
          ethers.utils.parseEther("100"),
          vestingDurationInDays,
          vestingCliffInDays
        )
    ).to.be.revertedWith("MATH:SUB_UNDERFLOW");
  });

  it("should revert if not enough allowance", async () => {
    const now = (await ethers.provider.getBlock()).timestamp;
    let totalVestingCount = await vestingVault.totalVestingCount();
    const vestingDurationInDays = 365;
    const vestingCliffInDays = 180;

    await expect(
      vestingVault.addTokenGrant(
        recipientAddress,
        now,
        0,
        vestingDurationInDays,
        vestingCliffInDays
      )
    ).to.be.revertedWith("amountVestedPerDay > 0");
  });

  it("should return (0, 0) if cliff has not been reached", async () => {
    const now = (await ethers.provider.getBlock()).timestamp;
    const vestingDurationInDays = 365;
    const vestingCliffInDays = 180;
    const amount = ethers.utils.parseEther("100");
    const offset = 120 * (60 * 60 * 24); // 120 days

    let totalVestingCount = await vestingVault.totalVestingCount();
    await vestingVault.addTokenGrant(
      recipientAddress,
      now + offset,
      amount,
      vestingDurationInDays,
      vestingCliffInDays
    );
    let [daysVested, amountVested] = await vestingVault.calculateGrantClaim(
      totalVestingCount
    );

    await expect(
      vestingVault.connect(recipient).claimVestedTokens(totalVestingCount)
    ).to.be.revertedWith("amountVested is 0");

    expect(daysVested).to.be.equal(0);
    expect(amountVested).to.be.equal(0);
  });
  it("should return (120, 0) if cliff has not been reached", async () => {
    const now = (await ethers.provider.getBlock()).timestamp;
    const vestingDurationInDays = 365;
    const vestingCliffInDays = 180;
    const amount = ethers.utils.parseEther("100");
    const offset = 120 * secondsPerDay; // 120 days

    let totalVestingCount = await vestingVault.totalVestingCount();
    await vestingVault.addTokenGrant(
      recipientAddress,
      now - offset,
      amount,
      vestingDurationInDays,
      vestingCliffInDays
    );
    let [daysVested, amountVested] = await vestingVault.calculateGrantClaim(
      totalVestingCount
    );
    expect(daysVested).to.be.equal(offset / secondsPerDay);
    expect(amountVested).to.be.equal(0);
  });
  it("should return (180, 49.31506849315068486) if cliff has not been reached", async () => {
    const now = (await ethers.provider.getBlock()).timestamp;
    const vestingDurationInDays = 365;
    const vestingCliffInDays = 180;
    const amount = ethers.utils.parseEther("100");
    const offset = 180 * secondsPerDay; // 120 days

    let totalVestingCount = await vestingVault.totalVestingCount();
    await vestingVault.addTokenGrant(
      recipientAddress,
      now - offset,
      amount,
      vestingDurationInDays,
      vestingCliffInDays
    );

    let [daysVested, amountVested] = await vestingVault.calculateGrantClaim(
      totalVestingCount
    );
    let expectedAmountVested = amount
      .div(ethers.BigNumber.from(vestingDurationInDays))
      .mul(ethers.BigNumber.from(daysVested));

    expect(daysVested).to.be.equal(offset / secondsPerDay);
    expect(amountVested).to.be.equal(expectedAmountVested);

    let prevBalanace = await token.balanceOf(recipientAddress);

    await expect(
      vestingVault.claimVestedTokens(totalVestingCount)
    ).to.be.revertedWith("Only recipient");

    await expect(
      vestingVault.connect(recipient).claimVestedTokens(totalVestingCount)
    )
      .to.emit(vestingVault, "GrantTokensClaimed")
      .withArgs(recipientAddress, expectedAmountVested);

    expect(await token.balanceOf(recipientAddress)).to.be.equal(
      prevBalanace.add(expectedAmountVested)
    );
  });

  it("should return (180, 49.31506849315068486) if cliff has not been reached", async () => {
    const now = (await ethers.provider.getBlock()).timestamp;
    const vestingDurationInDays = 365;
    const vestingCliffInDays = 180;
    const amount = ethers.utils.parseEther("100");
    const offset = 180 * secondsPerDay; // 120 days

    let totalVestingCount = await vestingVault.totalVestingCount();
    await vestingVault.addTokenGrant(
      recipientAddress,
      now - offset,
      amount,
      vestingDurationInDays,
      vestingCliffInDays
    );

    let [daysVested, amountVested] = await vestingVault.calculateGrantClaim(
      totalVestingCount
    );
    let expectedAmountVested = amount
      .div(ethers.BigNumber.from(vestingDurationInDays))
      .mul(ethers.BigNumber.from(daysVested));

    expect(daysVested).to.be.equal(offset / secondsPerDay);
    expect(amountVested).to.be.equal(expectedAmountVested);

    let prevBalanace = await token.balanceOf(recipientAddress);

    await expect(
      vestingVault.claimVestedTokens(totalVestingCount)
    ).to.be.revertedWith("Only recipient");
  });

  it("should change the recipient", async () => {
    const now = (await ethers.provider.getBlock()).timestamp;
    const vestingDurationInDays = 365;
    const vestingCliffInDays = 180;
    const amount = ethers.utils.parseEther("100");
    const offset = 180 * secondsPerDay; // 120 days

    let totalVestingCount = await vestingVault.totalVestingCount();
    await vestingVault.addTokenGrant(
      recipientAddress,
      now - offset,
      amount,
      vestingDurationInDays,
      vestingCliffInDays
    );

    let [daysVested, amountVested] = await vestingVault.calculateGrantClaim(
      totalVestingCount
    );

    await expect(
      vestingVault
        .connect(recipient)
        .changeRecipient(totalVestingCount, recipient2Address)
    )
      .to.emit(vestingVault, "ChangedRecipient")
      .withArgs(totalVestingCount, recipient2Address);

    let prevBalanace = await token.balanceOf(recipient2Address);

    await expect(
      vestingVault.connect(recipient2).claimVestedTokens(totalVestingCount)
    )
      .to.emit(vestingVault, "GrantTokensClaimed")
      .withArgs(recipient2Address, amountVested);

    expect(await token.balanceOf(recipient2Address)).to.be.equal(
      prevBalanace.add(amountVested)
    );
  });

  it("shouldn't be able to claim if not the recipient", async () => {
    const now = (await ethers.provider.getBlock()).timestamp;
    const vestingDurationInDays = 365;
    const vestingCliffInDays = 180;
    const amount = ethers.utils.parseEther("100");
    const offset = 180 * secondsPerDay; // 120 days

    let totalVestingCount = await vestingVault.totalVestingCount();
    await vestingVault.addTokenGrant(
      recipientAddress,
      now - offset,
      amount,
      vestingDurationInDays,
      vestingCliffInDays
    );

    let [daysVested, amountVested] = await vestingVault.calculateGrantClaim(
      totalVestingCount
    );

    await expect(
      vestingVault.connect(recipient2).claimVestedTokens(totalVestingCount)
    ).to.be.revertedWith("");
  });

  it("should return (365, 100) if cliff has not been reached", async () => {
    const now = (await ethers.provider.getBlock()).timestamp;
    const vestingDurationInDays = 365;
    const vestingCliffInDays = 180;
    const amount = ethers.utils.parseEther("100");
    const offset = 365 * secondsPerDay; // 120 days

    let totalVestingCount = await vestingVault.totalVestingCount();
    await vestingVault.addTokenGrant(
      recipientAddress,
      now - offset,
      amount,
      vestingDurationInDays,
      vestingCliffInDays
    );

    let [daysVested, amountVested] = await vestingVault.calculateGrantClaim(
      totalVestingCount
    );

    expect(daysVested).to.be.equal(vestingDurationInDays);
    expect(amountVested).to.be.equal(amount);
  });

  it("should be able to revoke", async () => {
    const now = (await ethers.provider.getBlock()).timestamp;
    const vestingDurationInDays = 365;
    const vestingCliffInDays = 180;
    const amount = ethers.utils.parseEther("100");
    const offset = 180 * secondsPerDay; // 180 days

    let totalVestingCount = await vestingVault.totalVestingCount();
    await vestingVault.addTokenGrant(
      recipientAddress,
      now - offset,
      amount,
      vestingDurationInDays,
      vestingCliffInDays
    );
    let prevBalance = await token.balanceOf(recipientAddress);

    let [daysVested, amountVested] = await vestingVault.calculateGrantClaim(
      totalVestingCount
    );

    await expect(vestingVault.removeTokenGrant(totalVestingCount))
      .to.emit(vestingVault, "GrantRemoved")
      .withArgs(recipientAddress, amountVested);
     expect(await token.balanceOf(recipientAddress)).to.be.equal(prevBalance.add(amountVested));
     expect((await vestingVault.tokenGrants(totalVestingCount)).recipient).to.be.equal(multisigAddress);

  });

  it("should get differen tokensVestedPerDay", async () => {
    const now = (await ethers.provider.getBlock()).timestamp;
    const vestingDurationInDays = 365;
    const vestingCliffInDays = 180;
    const amount = ethers.utils.parseEther("100");
    const amount2 = ethers.utils.parseEther("200");

    let totalVestingCount = await vestingVault.totalVestingCount();
    await vestingVault.addTokenGrant(
      recipientAddress,
      now,
      amount,
      vestingDurationInDays,
      vestingCliffInDays
    );

    let totalVestingCount2 = await vestingVault.totalVestingCount();
    await vestingVault.addTokenGrant(
      recipientAddress,
      now,
      amount2,
      vestingDurationInDays,
      vestingCliffInDays
    );

    expect(
      (await vestingVault.tokensVestedPerDay(totalVestingCount)).mul(2)
    ).to.be.equal(await vestingVault.tokensVestedPerDay(totalVestingCount2));
  });

  it("should be able to change the multisig", async () => {
    const now = (await ethers.provider.getBlock()).timestamp;
    const amount = ethers.utils.parseEther("100");
    const vestingDurationInDays = 365;
    const vestingCliffInDays = 180;

    await expect(
      vestingVault.changeMultiSig(ethers.constants.AddressZero)
    ).to.be.revertedWith("not valid recipient");

    await expect(vestingVault.changeMultiSig(multisig2Address))
      .to.emit(vestingVault, "ChangedMultisig")
      .withArgs(multisig2Address);
    let totalVestingCount = await vestingVault.totalVestingCount();

    await expect(
      vestingVault.addTokenGrant(
        recipientAddress,
        now,
        amount,
        vestingDurationInDays,
        vestingCliffInDays
      )
    ).to.be.revertedWith("not owner");

    await expect(
      vestingVault
        .connect(multisig2)
        .addTokenGrant(
          recipientAddress,
          now,
          amount,
          vestingDurationInDays,
          vestingCliffInDays
        )
    )
      .to.emit(vestingVault, "GrantAdded")
      .withArgs(recipientAddress, totalVestingCount);
  });
  describe("Not Revocable", async () => {
    it("Should revert", async () => {
      let vestingVaultFactoryRevocable = await ethers.getContractFactory(
        "VestingVault"
      );
      let vestingVaultRevocable = await vestingVaultFactoryRevocable.deploy(
        token.address,
        multisigAddress,
        false
      );
      await vestingVaultRevocable.deployed();
      await token.approve(
        vestingVaultRevocable.address,
        ethers.constants.MaxUint256
      );

      const now = (await ethers.provider.getBlock()).timestamp;
      const vestingDurationInDays = 365;
      const vestingCliffInDays = 180;
      const amount = ethers.utils.parseEther("100");
      const offset = 365 * secondsPerDay; // 120 days

      let totalVestingCount = await vestingVaultRevocable.totalVestingCount();
      await vestingVaultRevocable.addTokenGrant(
        recipientAddress,
        now,
        amount,
        vestingDurationInDays,
        vestingCliffInDays
      );

      await expect(
        vestingVaultRevocable.removeTokenGrant(totalVestingCount)
      ).to.revertedWith("Not revocable");
    });
  });
  describe("escapeHatchWithdrawal", async () => {
    it("Shouldn't be able to withdraw vested token", async () => {
      const now = (await ethers.provider.getBlock()).timestamp;
      const amount = ethers.utils.parseEther("100");
      const vestingDurationInDays = 365;
      const vestingCliffInDays = 180;
      await vestingVault.addTokenGrant(
        recipientAddress,
        now,
        amount,
        vestingDurationInDays,
        vestingCliffInDays
      );
      await expect(
        vestingVault.escapeHatchWithdrawal(
          recipientAddress,
          token.address,
          await token.balanceOf(vestingVault.address)
        )
      ).to.be.revertedWith("Only not vested token");
    });
    it("Shouldn't be able to withdraw vested token", async () => {
      const now = (await ethers.provider.getBlock()).timestamp;
      const amount = ethers.utils.parseEther("100");
      const vestingDurationInDays = 365;
      const vestingCliffInDays = 180;
      let chainId = (await ethers.provider.getNetwork()).chainId;
      let token2 = await tokenFactory.deploy(multisigAddress);
      await token2.deployed();
      await token2.transfer(
        vestingVault.address,
        ethers.utils.parseEther("200")
      );
      await vestingVault.addTokenGrant(
        recipientAddress,
        now,
        amount,
        vestingDurationInDays,
        vestingCliffInDays
      );
      await expect(
        vestingVault.escapeHatchWithdrawal(
          recipientAddress,
          token.address,
          await token.balanceOf(vestingVault.address)
        )
      ).to.be.revertedWith("Only not vested token");

      let balance = await token.balanceOf(vestingVault.address);

      await expect(
        vestingVault.escapeHatchWithdrawal(
          recipientAddress,
          token2.address,
          balance
        )
      )
        .to.emit(vestingVault, "EscapeHatchWithdrawal")
        .withArgs(multisigAddress, recipientAddress, token2.address, balance);
    });
  });
});
