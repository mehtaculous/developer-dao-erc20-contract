//SPDX-License-Identifier: MIT
pragma solidity ^0.8.2;

import "./MerkleProof.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/draft-ERC20Permit.sol";
import "@openzeppelin/contracts/utils/structs/BitMaps.sol";

contract DD is ERC20, ERC20Permit, Ownable {
    using BitMaps for BitMaps.BitMap;
    BitMaps.BitMap private claimed;

    // End timestamp of claim period
    uint256 public claimPeriodEnds;

    // Hash of merkle root
    bytes32 public merkleRoot;

    // Status of minting
    bool public mintingEnabled = true;

    // Decimal value of tokens
    uint256 private constant DECIMALS = 10 ** 18;

    // Events
    event Claim(address indexed _claimant, uint256 _amount);
    event MerkleRootChanged(bytes32 _merkleRoot);

    /**
     * @notice Initializes contract, mints tokens and sets end of claim period
     * @param _freeSupply Amount of tokens distributed to contract deployer
     * @param _airdropSupply Total amount of tokens for airdrop supply
     * @param _claimPeriodEnds Timestamp of when claim period ends
     */
    constructor(
        uint256 _freeSupply,
        uint256 _airdropSupply,
        uint256 _claimPeriodEnds
    ) ERC20("Developer DAO Token", "DD") ERC20Permit("Developer DAO") {
        _mint(msg.sender, _freeSupply * DECIMALS);
        _mint(address(this), _airdropSupply * DECIMALS);
        claimPeriodEnds = _claimPeriodEnds;
    }

    /**
     * @notice Member claims token airdrop.
     * @param _amount Amount of tokens to claim
     * @param _merkleProof List of nodes to reach root node in merkle tree
     *
     * Requirements:
     *
     * leaf node must be valid in merkle tree.
     * tokens must not already be claimed.
     *
     * Emits a {Claim & Transfer} event.
     */
    function claimTokens(uint256 _amount, bytes32[] calldata _merkleProof) external {
        bytes32 leaf = keccak256(abi.encodePacked(msg.sender, _amount));
        (bool valid, uint256 index) = MerkleProof.verify(_merkleProof, merkleRoot, leaf);
        require(valid, "DD: Valid proof required.");
        require(!isClaimed(index), "DD: Tokens already claimed.");

        claimed.set(index);
        emit Claim(msg.sender, _amount * DECIMALS);

        _transfer(address(this), msg.sender, _amount * DECIMALS);
    }

    /**
     * @notice Check if tokens have been claimed.
     * @param _index Positioning in merkle tree
     * @return boolean value
     */
    function isClaimed(uint256 _index) public view returns (bool) {
        return claimed.get(_index);
    }

    /**
     * @notice Sets the merkle root.
     * @param _merkleRoot Hash of root node in merkle tree
     *
     * Emits a {MerkleRootChanged} event.
     */
    function setMerkleRoot(bytes32 _merkleRoot) external onlyOwner {
        require(merkleRoot == bytes32(0), "DD: Merkle root already set");

        merkleRoot = _merkleRoot;
        emit MerkleRootChanged(_merkleRoot);
    }

    /**
     * @notice Owner withdraws remaining tokens and transfers to destination.
     * @param _dest Address of destination tokens are sent to
     *
     * Requirements:
     *
     * `block.timestamp` must be greater than end of claim period.
     *
     * Emits a {Transfer} event.
     */
    function sweep(address _dest) external onlyOwner {
        require(block.timestamp > claimPeriodEnds, "DD: Claim period not yet ended");
        _transfer(address(this), _dest, balanceOf(address(this)));
    }

    /**
     * @notice Owner disables minting for eternity.
     */
    function disableMinting() public onlyOwner {
        mintingEnabled = false;
    }

    /**
     * @notice Owner increases total supply of tokens.
     * @param _additionalSupply Amount of additional supply
     *
     * Requirements
     *
     * `mintingEnabled` must be set to true.
     */
    function mint(uint _additionalSupply) public onlyOwner {
        require(mintingEnabled == true, "DD: No new tokens can be minted");
        _mint(msg.sender, _additionalSupply * DECIMALS);
    }
}
