const {
  BN, // Big Number support
  constants, // Common constants, like the zero address and largest integers
  expectEvent, // Assertions for emitted events
  expectRevert, // Assertions for transactions that should fail
} = require("@openzeppelin/test-helpers");

const {
  ethers
} = require("@nomiclabs/buidler");

const {
  expect
} = require("chai");

const {
  createDomainSeparator
} = require("./helpers/erc712");
const {
  PERMIT_TYPEHASH,
  createPermitDigest
} = require("./helpers/erc2612");
const {
  TRANSFER_WITH_AUTHORIZATION_TYPEHASH,
  createTransferWithAuthorizationDigest
} = require("./helpers/erc3009");

const {
  ecsign,
  ecrecover
} = require("ethereumjs-util");

let tokenFactory, token, holder1, holder2;
let ownerAddress, holder1Address, holder2Address, spenderAddress;

const TOTAL_SUPPLY = ethers.utils.parseEther("100000000");
const TX_AMOUNT = ethers.utils.parseEther("100");
const TOKEN_APPROVAL = ethers.utils.parseEther("50");
describe("HEZ", function() {
  beforeEach(async function() {
    [
      owner,
      registryFunder,
      holder1,
      holder2,
      spender,
      ...addrs
    ] = await ethers.getSigners();

    ownerAddress = await owner.getAddress();
    holder1Address = await holder1.getAddress();
    holder2Address = await holder2.getAddress();
    spenderAddress = await spender.getAddress();

    let chainId = (await ethers.provider.getNetwork()).chainId;
    // We get the contract to deploy
    tokenFactory = await ethers.getContractFactory("HEZ");
    token = await tokenFactory.deploy(ownerAddress);
    await token.deployed();
  });

  it("set up the token correctly", async () => {
    expect(await token.name()).to.be.equal("Hermez Network Token");
    expect(await token.symbol()).to.be.equal("HEZ");
    expect(await token.decimals()).to.be.equal(18);
    expect(await token.totalSupply()).to.be.equal(TOTAL_SUPPLY);
  });

  describe("safe math", async () => {
    it("shouldn'be be able to mint more than MaxUint256", async () => {
      let chainId = (await ethers.provider.getNetwork()).chainId;
      let tokenFactoryMock = await ethers.getContractFactory("HEZMock");
      let tokenMock = await tokenFactoryMock.deploy(ownerAddress);
      await tokenMock.deployed();
      await expect(
        tokenMock.mint(ownerAddress, ethers.constants.MaxUint256)
      ).to.be.revertedWith('MATH:ADD_OVERFLOW');
    })
  })

  describe("transfers", async function() {
    it("can transfer tokens", async () => {
      await itTransfersCorrectly(
        ownerAddress,
        holder1Address,
        TX_AMOUNT,
        owner
      );
    });
    it("can transfer all tokens", async () => {
      let totalBalance = await token.balanceOf(ownerAddress);
      await itTransfersCorrectly(
        ownerAddress,
        holder1Address,
        totalBalance,
        owner
      );
    });
    it("cannot transfer above balance", async () => {
      await expect(
        token.connect(holder2).transfer(ownerAddress, TX_AMOUNT)
      ).to.be.revertedWith("MATH:SUB_UNDERFLOW");
    });
    it("cannot transfer to 0x0", async () => {
      await expect(
        token.connect(owner).transfer(ethers.constants.AddressZero, TX_AMOUNT)
      ).to.be.revertedWith("HEZ::_transfer: NOT_VALID_TRANSFER");
    });

    it("cannot transfer to token address", async () => {
      await expect(
        token.connect(owner).transfer(token.address, TX_AMOUNT)
      ).to.be.revertedWith("HEZ::_transfer: NOT_VALID_TRANSFER");
    });

    it("can transfer tokens twice", async () => {
      await itTransfersCorrectly(
        ownerAddress,
        holder1Address,
        TX_AMOUNT,
        owner
      );
      await itTransfersCorrectly(
        ownerAddress,
        holder1Address,
        TX_AMOUNT,
        owner
      );
      expect(await token.balanceOf(holder1Address)).to.be.equal(
        //ethers.utils.parseEther("200")
        TX_AMOUNT.add(TX_AMOUNT)
      );
    });
    it("can transfer to to itself", async () => {
      await itTransfersCorrectly(
        ownerAddress,
        ownerAddress,
        await token.balanceOf(ownerAddress),
        owner
      );
    });
  });

  describe("burn", async function() {
    it("should be able to burn", async () => {

      let prevFromBal = ethers.BigNumber.from(await token.balanceOf(ownerAddress));
      let prevSupply = ethers.BigNumber.from(await token.totalSupply());

      await expect(token.connect(owner).burn(TX_AMOUNT))
        .to.emit(token, "Transfer")
        .withArgs(ownerAddress, ethers.constants.AddressZero, TX_AMOUNT);

      expect(await token.totalSupply()).to.be.equal(prevSupply.sub(TX_AMOUNT));
      expect(await token.balanceOf(ownerAddress)).to.be.equal(prevFromBal.sub(TX_AMOUNT));

    });
    it("should be able to burn all the balance", async () => {

      let prevFromBal = ethers.BigNumber.from(await token.balanceOf(ownerAddress));
      let prevSupply = ethers.BigNumber.from(await token.totalSupply());

      await expect(token.connect(owner).burn(prevFromBal))
        .to.emit(token, "Transfer")
        .withArgs(ownerAddress, ethers.constants.AddressZero, prevFromBal);

      expect(await token.totalSupply()).to.be.equal(ethers.constants.AddressZero);
      expect(await token.balanceOf(ownerAddress)).to.be.equal(ethers.constants.AddressZero);

    });

    it("shouldn't be able to burn more than the current balance", async () => {

      let prevFromBal = ethers.BigNumber.from(await token.balanceOf(ownerAddress));
      let prevSupply = ethers.BigNumber.from(await token.totalSupply());

      await expect(
        token.connect(owner).burn(prevFromBal.add(1)))
        .to.be.revertedWith("MATH:SUB_UNDERFLOW");
       
    });

  })
  describe("approvals", async function() {
    describe("has allowance", async function() {
      beforeEach(async () => {
        await token.connect(owner).approve(spenderAddress, TOKEN_APPROVAL);
      });
      it("can change allowance", async () => {
        let newApproval = TOKEN_APPROVAL.add(TOKEN_APPROVAL);
        await token.connect(owner).approve(spenderAddress, newApproval);
        expect(await token.allowance(ownerAddress, spenderAddress)).to.be.equal(
          newApproval
        );
      });

      it("can transfer below allowance", async () => {
        await itTransfersCorrectly(
          ownerAddress,
          spenderAddress,
          TOKEN_APPROVAL.sub(1),
          spender
        );
      });

      it("can transfer all of allowance", async () => {
        let totalAllowance = await token.allowance(
          ownerAddress,
          spenderAddress
        );
        await itTransfersCorrectly(
          ownerAddress,
          spenderAddress,
          totalAllowance,
          spender
        );
      });

      it("cannot transfer above balance", async () => {
        await expect(
          token
          .connect(spender)
          .transferFrom(ownerAddress, spenderAddress, TOKEN_APPROVAL.add(1))
        ).to.be.revertedWith("MATH:SUB_UNDERFLOW");
      });
    });
    describe("has infinity allowance", async function() {
      beforeEach(async () => {
        await token
          .connect(owner)
          .approve(spenderAddress, ethers.constants.MaxUint256);
      });
      it("can change allowance", async () => {
        await token.connect(owner).approve(spenderAddress, TOKEN_APPROVAL);
        expect(await token.allowance(ownerAddress, spenderAddress)).to.be.equal(
          TOKEN_APPROVAL
        );
      });
      it("can transfer without changing allowance", async () => {
        await itTransfersCorrectly(
          ownerAddress,
          spenderAddress,
          await token.balanceOf(ownerAddress),
          owner
        );
        expect(await token.allowance(ownerAddress, spenderAddress)).to.be.equal(
          ethers.constants.MaxUint256
        );
      });
      it("cannot transfer above balance", async () => {
        await expect(
          token
          .connect(spender)
          .transferFrom(
            ownerAddress,
            spenderAddress,
            (await token.balanceOf(ownerAddress)).add(1)
          )
        ).to.be.revertedWith("MATH:SUB_UNDERFLOW");
      });
    });

    describe("no allowance", async function() {
      it("can increase allowance", async () => {
        let newApproval = TOKEN_APPROVAL.add(TOKEN_APPROVAL);
        await expect(token.connect(owner).approve(spenderAddress, newApproval))
          .to.emit(token, "Approval")
          .withArgs(ownerAddress, spenderAddress, newApproval);
        expect(await token.allowance(ownerAddress, spenderAddress)).to.be.equal(
          newApproval
        );
      });

      it("cannot transfer", async () => {
        await expect(
          token
          .connect(spender)
          .transferFrom(
            ownerAddress,
            spenderAddress,
            ethers.utils.parseEther("1")
          )
        ).to.be.revertedWith("MATH:SUB_UNDERFLOW");
      });
    });
  });

  /*
  describe("ERC-712", async function() {

    it("has the correct ERC712 domain separator", async () => {
      let domainSeparator = createDomainSeparator(
        await token.name(),
        "1",
        (await ethers.provider.getNetwork()).chainId,
        token.address
      );
      expect(await token.DOMAIN_SEPARATOR()).to.be.equal(domainSeparator);
    });
  });
  */
  describe("ERC-2612", async function() {
    let erc2612Wallet;
    before(async () => {
      erc2612Wallet = ethers.Wallet.createRandom();
    });
    it("has the correct permit typehash", async () => {
      await expect(await token.PERMIT_TYPEHASH()).to.be.equal(PERMIT_TYPEHASH);
    });
    it("can set allowance through permit", async () => {

      const deadline = ethers.constants.MaxUint256;
      const firstValue = ethers.utils.parseEther("100");
      const firstNonce = await token.nonces(erc2612Wallet.address);
      const firstSig = await createPermitSignature(
        erc2612Wallet,
        spender,
        firstValue,
        firstNonce,
        deadline
      );
      await expect(
          token.permit(
            erc2612Wallet.address,
            spenderAddress,
            firstValue,
            deadline,
            firstSig.v,
            firstSig.r,
            firstSig.s
          ))
        .to.emit(token, 'Approval')
        .withArgs(erc2612Wallet.address, spenderAddress, firstValue);

      await expect(await token.allowance(erc2612Wallet.address, spenderAddress)).to.be.equal(firstValue);
      await expect(await token.nonces(erc2612Wallet.address)).to.be.equal(firstNonce.add(1));

      const secondValue = ethers.utils.parseEther("50");
      const secondNonce = await token.nonces(erc2612Wallet.address);
      const secondSig = await createPermitSignature(erc2612Wallet, spender, secondValue, secondNonce, deadline)
      await expect(
          token.permit(
            erc2612Wallet.address,
            spenderAddress,
            secondValue,
            deadline,
            secondSig.v,
            secondSig.r,
            secondSig.s
          ))
        .to.emit(token, 'Approval')
        .withArgs(erc2612Wallet.address, spenderAddress, secondValue);
      await expect(await token.allowance(erc2612Wallet.address, spenderAddress)).to.be.equal(secondValue);
      await expect(await token.nonces(erc2612Wallet.address)).to.be.equal(secondNonce.add(1));
    });
    it('cannot use wrong signature', async () => {
      const deadline = ethers.constants.MaxUint256
      const nonce = await token.nonces(erc2612Wallet.address)

      const firstValue = ethers.utils.parseEther("100")
      const secondValue = ethers.utils.parseEther("500")
      const firstSig = await createPermitSignature(erc2612Wallet, spender, firstValue, nonce, deadline)
      const secondSig = await createPermitSignature(erc2612Wallet, spender, secondValue, nonce, deadline)

      await expect(
        token.permit(
          erc2612Wallet.address,
          spenderAddress,
          firstValue,
          deadline,
          secondSig.v,
          secondSig.r,
          secondSig.s
        )).to.be.revertedWith('HEZ::_validateSignedData: INVALID_SIGNATURE');
    })
    it('cannot use expired permit', async () => {
      const value = ethers.utils.parseEther("100")
      const nonce = await token.nonces(erc2612Wallet.address)
      // Use a prior deadline
      const current = (await ethers.provider.getBlock()).timestamp;
      const deadline = current - 60

      const {
        r,
        s,
        v
      } = await createPermitSignature(erc2612Wallet, spender, value, nonce, deadline)
      await expect(
        token.permit(
          erc2612Wallet.address,
          spenderAddress,
          value,
          deadline,
          v,
          r,
          s
        )).to.be.revertedWith('HEZ::permit: AUTH_EXPIRED');
    })
    it('cannot use surpassed permit', async () => {
      const deadline = ethers.constants.MaxUint256
      const nonce = await token.nonces(erc2612Wallet.address)

      // Generate two signatures with the same nonce and use one
      const firstValue = ethers.utils.parseEther("100")
      const secondValue = ethers.utils.parseEther("500")
      const firstSig = await createPermitSignature(erc2612Wallet, spender, firstValue, nonce, deadline)
      const secondSig = await createPermitSignature(erc2612Wallet, spender, secondValue, nonce, deadline)

      // Using one should disallow the other
      await token.permit(erc2612Wallet.address, spenderAddress, secondValue, deadline, secondSig.v, secondSig.r, secondSig.s)
      await expect(
        token.permit(
          erc2612Wallet.address,
          spenderAddress,
          firstValue,
          deadline,
          firstSig.v,
          firstSig.r,
          firstSig.s
        )).to.be.revertedWith('HEZ::_validateSignedData: INVALID_SIGNATURE');
    })
  });
  describe("ERC-3009", async function() {
    let erc3009Wallet;
    before(async () => {
      erc3009Wallet = ethers.Wallet.createRandom();
    });
    beforeEach(async () => {
      await token.transfer(erc3009Wallet.address, ethers.utils.parseEther("1000"));
    })
    it('has the correct transferWithAuthorization typehash', async () => {
      expect(await token.TRANSFER_WITH_AUTHORIZATION_TYPEHASH()).to.be.equal(TRANSFER_WITH_AUTHORIZATION_TYPEHASH)
    })
    it('can transfer through transferWithAuthorization', async () => {
      const validAfter = 0
      const validBefore = ethers.constants.MaxUint256
      const firstNonce = ethers.utils.keccak256(ethers.utils.toUtf8Bytes('first'))
      const secondNonce = ethers.utils.keccak256(ethers.utils.toUtf8Bytes('second'))

      expect(await token.authorizationState(erc3009Wallet.address, firstNonce)).to.be.equal(false)
      expect(await token.authorizationState(erc3009Wallet.address, secondNonce)).to.be.equal(false)
      const firstValue = ethers.utils.parseEther("25")
      const firstSig = await createTransferWithAuthorizationSignature(erc3009Wallet, holder2Address, firstValue, validAfter, validBefore, firstNonce)

      let prevFromBal = await token.balanceOf(erc3009Wallet.address);
      let prevToBal = await token.balanceOf(holder2Address);
      let prevSupply = await token.totalSupply();

      await expect(
          token.transferWithAuthorization(erc3009Wallet.address, holder2Address, firstValue, validAfter, validBefore, firstNonce, firstSig.v, firstSig.r, firstSig.s))
        .to.emit(token, "Transfer")
        .withArgs(erc3009Wallet.address, holder2Address, firstValue);

      expect(await token.balanceOf(erc3009Wallet.address)).to.be.equal(prevFromBal.sub(firstValue));
      expect(await token.balanceOf(holder2Address)).to.be.equal(prevToBal.add(firstValue));
      expect(await token.totalSupply()).to.be.equal(prevSupply);
      expect(await token.authorizationState(erc3009Wallet.address, firstNonce)).to.be.equal(true);

      const secondValue = ethers.utils.parseEther("10")
      const secondSig = await createTransferWithAuthorizationSignature(erc3009Wallet, holder2Address, secondValue, validAfter, validBefore, secondNonce)

      prevFromBal = await token.balanceOf(erc3009Wallet.address);
      prevToBal = await token.balanceOf(holder2Address);
      prevSupply = await token.totalSupply();

      await expect(
          token.transferWithAuthorization(erc3009Wallet.address, holder2Address, secondValue, validAfter, validBefore, secondNonce, secondSig.v, secondSig.r, secondSig.s))
        .to.emit(token, "Transfer")
        .withArgs(erc3009Wallet.address, holder2Address, secondValue);

      expect(await token.balanceOf(erc3009Wallet.address)).to.be.equal(prevFromBal.sub(secondValue));
      expect(await token.balanceOf(holder2Address)).to.be.equal(prevToBal.add(secondValue));
      expect(await token.totalSupply()).to.be.equal(prevSupply);
      expect(await token.authorizationState(erc3009Wallet.address, secondNonce)).to.be.equal(true);

    })

    it('cannot use wrong signature', async () => {
      const validAfter = 0
      const validBefore = ethers.constants.MaxUint256
      const firstNonce = ethers.utils.keccak256(ethers.utils.toUtf8Bytes('first'))
      const secondNonce = ethers.utils.keccak256(ethers.utils.toUtf8Bytes('second'))

      const firstValue = ethers.utils.parseEther("25")
      const secondValue = ethers.utils.parseEther("10")
      const firstSig = await createTransferWithAuthorizationSignature(erc3009Wallet, holder2Address, firstValue, validAfter, validBefore, firstNonce)
      const secondSig = await createTransferWithAuthorizationSignature(erc3009Wallet, holder2Address, secondValue, validAfter, validBefore, secondNonce)

      // Use a mismatching signature
      await expect(
        token.transferWithAuthorization(erc3009Wallet.address, holder2Address, firstValue, validAfter, validBefore, firstNonce, secondSig.v, secondSig.r, secondSig.s)
      ).to.be.revertedWith('HEZ::_validateSignedData: INVALID_SIGNATURE');
    })
    it('cannot use before valid period', async () => {
      const value = ethers.utils.parseEther("25")
      const nonce = ethers.utils.keccak256(ethers.utils.toUtf8Bytes('nonce'))

      // Use a future period
      const current = (await ethers.provider.getBlock()).timestamp;
      const validAfter = current + 60
      const validBefore = ethers.constants.MaxUint256
      const {
        r,
        s,
        v
      } = await createTransferWithAuthorizationSignature(erc3009Wallet, holder2Address, value, validAfter, validBefore, nonce)

      await expect(
        token.transferWithAuthorization(erc3009Wallet.address, holder2Address, value, validAfter, validBefore, nonce, v, r, s)
      ).to.be.revertedWith('HEZ::transferWithAuthorization: AUTH_NOT_YET_VALID');
    })

    it('cannot use after valid period', async () => {
      const value = ethers.utils.parseEther("100")
      const nonce = ethers.utils.keccak256(ethers.utils.toUtf8Bytes('nonce'))

      // Use a prior period  
      const current = (await ethers.provider.getBlock()).timestamp;
      const validBefore = current - 60
      const validAfter = 0

      const {
        r,
        s,
        v
      } = await createTransferWithAuthorizationSignature(erc3009Wallet, holder2Address, value, validAfter, validBefore, nonce)

      await expect(
        token.transferWithAuthorization(erc3009Wallet.address, holder2Address, value, validAfter, validBefore, nonce, v, r, s)
      ).to.be.revertedWith('HEZ::transferWithAuthorization: AUTH_EXPIRED');

    })

    it('cannot use expired nonce', async () => {
      const value = ethers.utils.parseEther("100")
      const nonce = ethers.utils.keccak256(ethers.utils.toUtf8Bytes('nonce'))
      const validAfter = 0
      const validBefore = ethers.constants.MaxUint256

      const firstValue = ethers.utils.parseEther("25")
      const secondValue = ethers.utils.parseEther("10")
      const firstSig = await createTransferWithAuthorizationSignature(erc3009Wallet, holder2Address, firstValue, validAfter, validBefore, nonce)
      const secondSig = await createTransferWithAuthorizationSignature(erc3009Wallet, holder2Address, secondValue, validAfter, validBefore, nonce)

      // Using one should disallow the other
      await token.transferWithAuthorization(erc3009Wallet.address, holder2Address, firstValue, validAfter, validBefore, nonce, firstSig.v, firstSig.r, firstSig.s)
      await expect(
        token.transferWithAuthorization(erc3009Wallet.address, holder2Address, secondValue, validAfter, validBefore, nonce, secondSig.v, secondSig.r, secondSig.s)
      ).to.be.revertedWith('HEZ::transferWithAuthorization: AUTH_ALREADY_USED');
    })

  });
});

async function createPermitSignature(owner, spender, value, nonce, deadline) {
  const digest = await createPermitDigest(
    token,
    owner.address,
    await spender.getAddress(),
    value,
    nonce,
    deadline
  );

  /*
  console.log("digest: " + digest)
  // To sign the 32 bytes of data, make sure you pass in the data
  let signature = await owner.signMessage(ethers.utils.toUtf8Bytes(digest.toString()));

  let sig = ethers.utils.splitSignature(signature);
  let recovered = ethers.utils.recoverAddress(digest, signature);
  console.log(recovered);
  console.log(recovered === owner.address);

  let v1 = sig.v;
  let r1 = sig.r;
  let s1 = sig.s;
*/

  let {
    r,
    s,
    v
  } = ecsign(
    Buffer.from(digest.slice(2), "hex"),
    Buffer.from(owner.privateKey.slice(2), "hex")
  );

  /*
  console.log("r: ", r.toString('hex'));
  console.log("s: ", s.toString('hex'));
  console.log("v: ", v);
  */
  return {
    v,
    r,
    s,
  };
}

async function createTransferWithAuthorizationSignature(from, to, value, validBefore, validAfter, nonce) {
  const digest = await createTransferWithAuthorizationDigest(token, from.address, to, value, validBefore, validAfter, nonce)
  const {
    r,
    s,
    v
  } = ecsign(
    Buffer.from(digest.slice(2), "hex"),
    Buffer.from(from.privateKey.slice(2), "hex")
  )

  return {
    r,
    s,
    v
  }
}

async function itTransfersCorrectly(from, to, value, sender) {
  let senderAddress = await sender.getAddress();
  const isMint = from === ethers.constants.AddressZero;

  const prevFromBal = await token.balanceOf(from);
  const prevToBal = await token.balanceOf(to);
  const prevSupply = await token.totalSupply();

  if (senderAddress == from) {
    await expect(token.connect(sender).transfer(to, value))
      .to.emit(token, "Transfer")
      .withArgs(senderAddress, to, value);
  } else {
    await expect(token.connect(sender).transferFrom(from, to, value))
      .to.emit(token, "Transfer")
      .withArgs(from, to, value);
  }

  if (isMint) {
    expect(await token.balanceOf(to)).to.be.equal(prevToBal.add(value));
    expect(await token.totalSupply()).to.be.equal(prevSupply.add(value));
  } else {
    if (from != to) {
      expect(await token.balanceOf(from)).to.be.equal(prevFromBal.sub(value));
      expect(await token.balanceOf(to)).to.be.equal(prevToBal.add(value));
    } else {
      expect(await token.balanceOf(to)).to.be.equal(prevToBal);
    }
    expect(await token.totalSupply()).to.be.equal(prevSupply);
  }
}