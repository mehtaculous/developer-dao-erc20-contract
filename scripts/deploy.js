// We require the Hardhat Runtime Environment explicitly here. This is optional
// but useful for running the script in a standalone fashion through `node <script>`.
//
// When running the script with `npx hardhat run <script>` you'll find the Hardhat
// Runtime Environment's members available in the global scope.
const hre = require("hardhat");

async function main() {
  const DD = await hre.ethers.getContractFactory("DD");
   // token amounts TBD, these numbers are just for testing puropses
  const dd = await DD.deploy(10_000_000, 5_000_000, 1640433346);

  await dd.deployed();
  console.log("dd deployed to:", dd.address);

}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
