// We require the Buidler Runtime Environment explicitly here. This is optional 
// but useful for running the script in a standalone fashion through `node <script>`.
// When running the script with `buidler run <script>` you'll find the Buidler
// Runtime Environment's members available in the global scope.
const bre = require("@nomiclabs/buidler");

const {
    TASK_FLATTEN_GET_FLATTENED_SOURCE
} = require("@nomiclabs/buidler/builtin-tasks/task-names");

const TOTAL_SUPPLY = ethers.utils.parseEther("100000000")
let owner,registryFunder;
async function main() {
    // Buidler always runs the compile task when running scripts through it. 
    // If this runs in a standalone fashion you may want to call compile manually 
    // to make sure everything is compiled
    // await bre.run('compile');

    [
        owner,
        registryFunder,
        ...addrs
      ] = await ethers.getSigners();

   
    // We get the contract to deploy
    const Unipool = await ethers.getContractFactory("Unipool");
    const unipool = await Unipool.deploy();
    await unipool.deployed();

    console.log("Unipool address:", unipool.address);
    sleep(10000);

    let flattenedSource = await bre.run(TASK_FLATTEN_GET_FLATTENED_SOURCE);

    await bre.run("verify-contract", {
        address: unipool.address,
        contractName: "Unipool",
        source: flattenedSource
    });
    console.log("https://rinkeby.etherscan.io/address/"+token.address)
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main()
    .then(() => process.exit(0))
    .catch(error => {
        console.error(error);
        process.exit(1);
    });

    function sleep(ms) {
      return new Promise((resolve) => {
        setTimeout(resolve, ms);
      });
    }