const { ethers } = require("hardhat")
const { MerkleTree } = require('merkletreejs')
const keccak256 = require('keccak256')

const leaves = [
  "0xB2Ebc9b3a788aFB1E942eD65B59E9E49A1eE500D","0x5eC5e26D5304EF62310b5bC46A150d15E144e122","0xcc13187AfEf880894a8832b854eFE9816449BC59","0x1d69d3CDEbB5c3E2B8b73cC4D49Aa145ecb7950F","0xDc173B36003a886b3248650206A1fAE7433660A2","0xcAa3a3c852442F06806170D137248bb21ddb0E1B","0xd75135B26b1bC182266B2B22108Cc3cEF2c171D5","0x75448866cEe7A4680dC58FE846446aF71F9f8438","0xAD0e00593C796665b5B44Dc5410c906e09100a67","0x7911670881A81F8410d06053d7B3c237cE77b9B4","0xD02c0b401d1865e87bC4365B0a2621d7d8B78348","0x786c9Fb9494Cc3c82d5a47A62b4392c7004106ca","0xCe2F6F6a51F725049d7D56aB11C09A096360398a","0x03f9bc4648a98CDc61FcA7a177D809edAB2c14fc","0x27F8602E403B6EA18f8711A7858fa4a94ef3269b","0xd6AB094FE02B9D2F5bE7F400D9A06717f95daE9E","0x40F0A3fd9295e2a409F2512Fde438fe6ed8B5ec8","0xA703B1cB89F50939173a124ba76571369cF69953","0x184E2D53a04bC87A6b597703eDcD62d768DA1F27","0xa4A13B3f22BC0e90235e17AE9343B2c7e04e96c8","0x926b8edBef960305cBcAA839b1019c0a54358f2C","0x6D95392544846c0cD6CcEc0342F24534d84393e7",
  "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266", "0x70997970C51812dc3A010C7d01b50e0d17dc79C8"
].map(v => keccak256(v))

const tree = new MerkleTree(leaves, keccak256, { sort: true })

/*
uint256 freeSupply,
uint256 airdropSupply,
uint256 _claimPeriodEnds
*/

 // token amounts TBD, these numbers are just for testing purposes
 const tokenSupply = 10000000
 const airdropAmount = 2000000
 const timestamp = 1640433346
 const pastTimeStamp = 1611323961

describe("Developer DAO ERC20 token contract", function () {
  it("Should mint tokens", async function() {
    const DD = await hre.ethers.getContractFactory("DD")
    const dd = await DD.deploy(tokenSupply, airdropAmount, timestamp)
    await dd.deployed()

    const accounts = await hre.ethers.getSigners()
    const treasury = accounts[0].address

    /* total supply */
    const supply = await dd.totalSupply()
    console.log('Supply: ', ethers.utils.formatEther(supply))

    /* treasury balance */
    const balance = await dd.balanceOf(treasury)
    console.log('Treasury balance:', ethers.utils.formatEther(balance))

    /* contract balance */
    const contractBalance = await dd.balanceOf(dd.address)
    console.log('Contract balance: ', ethers.utils.formatEther(contractBalance))
  })

  it("Should allow a user to claim tokens", async function() {
    const DD = await hre.ethers.getContractFactory("DD")
    const dd = await DD.deploy(tokenSupply, airdropAmount, timestamp)
    await dd.deployed()
    const accounts = await hre.ethers.getSigners() 
    const contractAddress = dd.address
  
    /* test claim */
    const claimAccount = accounts[1]
    const root = tree.getHexRoot()
    await dd.setMerkleRoot(root)
    const leaf = keccak256(claimAccount.address)
    const proof = tree.getHexProof(leaf)
    
    await dd.connect(claimAccount).claimTokens(proof)

    /* Get claimer balance */
    let claimerBalance = await dd.balanceOf(claimAccount.address)
    console.log('Claimer balance: ', ethers.utils.formatEther(claimerBalance))

    /* log contract supply after first witdrawal */
    const contractBalance = await dd.balanceOf(contractAddress)
    console.log('Contract balance: ', ethers.utils.formatEther(contractBalance))
  })

  it("Should not allow someone to claim twice", async function() {
    let error = false
    const DD = await hre.ethers.getContractFactory("DD")
    const dd = await DD.deploy(tokenSupply, airdropAmount, timestamp)
    await dd.deployed()
    const accounts = await hre.ethers.getSigners() 

    /* test claim */
    const claimAccount = accounts[1]
    const root = tree.getHexRoot()
    await dd.setMerkleRoot(root)
    const leaf = keccak256(claimAccount.address)
    const proof = tree.getHexProof(leaf)
    
    await dd.connect(claimAccount).claimTokens(proof)

    try {
      /* try to claim again */
      await dd.connect(claimAccount).claimTokens(proof)
      error = true
    } catch (err) {}

    if(error) throw new Error("Should not allow someone to mint twice")  
  })

  it("Should allow the treasury to mint", async function() {
    const DD = await hre.ethers.getContractFactory("DD")
    const dd = await DD.deploy(tokenSupply, airdropAmount, timestamp)
    await dd.deployed()
    const accounts = await hre.ethers.getSigners() 
    const treasury = accounts[0]

    /* treasury balance */
    const balance = await dd.balanceOf(treasury.address)
    console.log('Treasury balance:', ethers.utils.formatEther(balance))

    /* mint more tokens */
    await dd.mint(1_000_000)

    let treasuryBalance = await dd.balanceOf(treasury.address)
    console.log('New treasury balance after additional mint: ', ethers.utils.formatEther(treasuryBalance))
  })

  it("Should allow a sweep after the claim period ends", async function() {
    const DD = await hre.ethers.getContractFactory("DD")
    const dd = await DD.deploy(tokenSupply, airdropAmount, pastTimeStamp)
    await dd.deployed()
    const accounts = await hre.ethers.getSigners() 
    const treasury = accounts[0]

    await dd.sweep(treasury.address)
  })

  it("Should not allow a sweep before the claim period ends", async function() {
    let error = false
    const DD = await hre.ethers.getContractFactory("DD")
    const dd = await DD.deploy(tokenSupply, airdropAmount, timestamp)
    await dd.deployed()
    const accounts = await hre.ethers.getSigners() 
    const treasury = accounts[0]

    try {
      /* try to sweep before claim period */
      await dd.sweep(treasury.address)
      error = true
    } catch (err) {}
  
    if(error) throw new Error("Should not allow a sweep before the claim period ends")
  })

  it("Should not allow a merkle tree to be set twice", async function() {
    let error = false
    const DD = await hre.ethers.getContractFactory("DD")
    const dd = await DD.deploy(tokenSupply, airdropAmount, timestamp)
    await dd.deployed()

    const root = tree.getHexRoot()
    await dd.setMerkleRoot(root)

    try {
      /* try to set merkle root again */
      await dd.setMerkleRoot(root)
      error = true
    } catch (err) {}

    if(error) throw new Error("Merkle root should not be able to be set twice")
    
  })
})