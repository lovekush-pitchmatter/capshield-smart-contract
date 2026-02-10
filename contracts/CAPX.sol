// SPDX-License-Identifier: MIT
pragma solidity 0.8.30;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Burnable.sol";
import "@openzeppelin/contracts/security/Pausable.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";
import "@chainlink/contracts/src/v0.8/interfaces/AggregatorV3Interface.sol";
import "@chainlink/contracts/src/v0.8/automation/AutomationCompatible.sol";

// CAPX - CAPShield Token (Shield Token)
// ERC20 + AccessControl with advanced features
// Symbol: CAPY
// Hard cap: 100,000,000 tokens
// Features:
// - Role-based minting (Team, Treasury, DAO)
// - Revenue-mint formula hook (Chainlink Oracle)
// - Transfer hooks: 1% burn, 1% treasury allocation
// - Exemptions for Treasury and DAO
// - Pause + Emergency Stop
// - Multisig admin roles
// - Chainlink Automation (Keepers)
contract CAPX is ERC20, ERC20Burnable, Pausable, AccessControl, AutomationCompatibleInterface {
    ///////////////// ERRORS /////////////////

    error ZeroAddress();
    error AdminMustBeContract();
    error ExceedsMaxSupply();
    error ZeroRevenue();
    error ZeroMarketValue();
    error ZeroMintAmount();
    error CannotSetExemptionForZeroAddress();
    error TransferFromZeroAddress();
    error TransferToZeroAddress();
    error InvalidOraclePrice();

    ///////////////// ROLE DEFINITIONS /////////////////

    // Role definitions
    bytes32 public constant PAUSER_ROLE = keccak256("PAUSER_ROLE");
    bytes32 public constant TEAM_MINTER_ROLE = keccak256("TEAM_MINTER_ROLE");
    bytes32 public constant TREASURY_MINTER_ROLE = keccak256("TREASURY_MINTER_ROLE");
    bytes32 public constant DAO_MINTER_ROLE = keccak256("DAO_MINTER_ROLE");

    ///////////////// STATE VARIABLES /////////////////

    // Token parameters
    uint8 private constant _DECIMALS = 18;
    uint256 public constant MAX_SUPPLY = 100_000_000 * 10 ** _DECIMALS; // 100M hard cap

    // Transfer fee parameters
    uint256 public constant BURN_FEE_PERCENT = 1; // 1% burn
    uint256 public constant TREASURY_FEE_PERCENT = 1; // 1% treasury
    uint256 private constant FEE_DENOMINATOR = 100;

    // Oracle parameters
    AggregatorV3Interface public priceFeed;
    uint256 public constant ORACLE_PRECISION = 1e8;

    // Automation parameters
    uint256 public mintInterval = 1 days;
    uint256 public lastMintTime;
    uint256 public pendingRevenue;

    // Important addresses
    address public treasuryAddress;
    address public daoAddress;

    // Total minted tracking (irreversible cap enforcement)
    uint256 public totalMinted;

    ///////////////// MAPPINGS /////////////////

    mapping(address account => bool exempt) public isExemptFromFees;

    ///////////////// EVENTS /////////////////
    event RevenueMint(address indexed to, uint256 amount, uint256 revenue, uint256 marketValue);
    event TreasuryFee(address indexed from, address indexed to, uint256 amount);
    event TreasuryAddressUpdated(address indexed oldAddress, address indexed newAddress);
    event DAOAddressUpdated(address indexed oldAddress, address indexed newAddress);
    event ExemptionUpdated(address indexed account, bool isExempt);

    ///////////////// CONSTRUCTOR /////////////////

    /**
     * @notice Constructor - initializes with zero supply
     * @param _treasuryAddress Treasury address for fee collection
     * @param _daoAddress DAO address for governance
     * @param _adminAddress Multisig admin address (must be a contract)
     * @param _priceFeedAddress Chainlink Price Feed address
     */
    constructor(
        address _treasuryAddress,
        address _daoAddress,
        address _adminAddress,
        address _priceFeedAddress
    ) ERC20("CAPShield Token", "CAPY") {
        require(_treasuryAddress != address(0), ZeroAddress());
        require(_daoAddress != address(0), ZeroAddress());
        require(_adminAddress != address(0), ZeroAddress());
        require(_priceFeedAddress != address(0), ZeroAddress());

        // This prevents single EOA from having full control over the token
        require(_isContract(_adminAddress), AdminMustBeContract());

        treasuryAddress = _treasuryAddress;
        daoAddress = _daoAddress;
        priceFeed = AggregatorV3Interface(_priceFeedAddress);

        // Grant roles to admin (multisig)
        _grantRole(DEFAULT_ADMIN_ROLE, _adminAddress);
        _grantRole(PAUSER_ROLE, _adminAddress);
        _grantRole(TEAM_MINTER_ROLE, _adminAddress);
        _grantRole(TREASURY_MINTER_ROLE, _adminAddress);
        _grantRole(DAO_MINTER_ROLE, _adminAddress);

        // Set exemptions for Treasury and DAO
        isExemptFromFees[_treasuryAddress] = true;
        isExemptFromFees[_daoAddress] = true;

        emit ExemptionUpdated(_treasuryAddress, true);
        emit ExemptionUpdated(_daoAddress, true);
    }

    ///////////////// INTERNAL FUNCTIONS /////////////////

    /**
     * @notice Check if an address is a contract
     * @param account Address to check
     * @return True if the address has code (is a contract)
     */
    function _isContract(address account) internal view returns (bool) {
        uint256 size;
        assembly {
            size := extcodesize(account)
        }
        return size > 0;
    }

    ///////////////// GETTER FUNCTIONS /////////////////

    /**
     * @dev Returns decimals
     */
    function decimals() public pure override returns (uint8) {
        return _DECIMALS;
    }

    /**
     * @dev Team minting function
     * @param to Recipient address
     * @param amount Amount to mint
     */
    function teamMint(address to, uint256 amount) external onlyRole(TEAM_MINTER_ROLE) whenNotPaused {
        _mintWithCapCheck(to, amount);
    }

    /**
     * @dev Treasury minting function
     * @param to Recipient address
     * @param amount Amount to mint
     */
    function treasuryMint(address to, uint256 amount) external onlyRole(TREASURY_MINTER_ROLE) whenNotPaused {
        _mintWithCapCheck(to, amount);
    }

    /**
     * @dev DAO minting function
     * @param to Recipient address
     * @param amount Amount to mint
     */
    function daoMint(address to, uint256 amount) external onlyRole(DAO_MINTER_ROLE) whenNotPaused {
        _mintWithCapCheck(to, amount);
    }

    /**
     * @dev Add revenue to the pending pool (Simulates receiving earnings)
     */
    function addRevenue(uint256 amount) external {
        pendingRevenue += amount;
    }

    /**
     * @dev Chainlink Automation: Check if upkeep is needed
     */
    function checkUpkeep(bytes calldata /* checkData */)
        external
        view
        override
        returns (bool upkeepNeeded, bytes memory /* performData */)
    {
        upkeepNeeded = (block.timestamp - lastMintTime) > mintInterval && pendingRevenue > 0;
        return (upkeepNeeded, "");
    }

    /**
     * @dev Chainlink Automation: Execute upkeep (Mint pending revenue)
     */
    function performUpkeep(bytes calldata /* performData */) external override {
        // Validation
        if ((block.timestamp - lastMintTime) <= mintInterval || pendingRevenue == 0) {
            revert("Upkeep not needed");
        }
        
        uint256 revenueToMint = pendingRevenue;
        pendingRevenue = 0;
        lastMintTime = block.timestamp;

        // Execute internal mint
        _revenueMintLogic(treasuryAddress, revenueToMint);
    }

    /**
     * @dev Revenue-based minting function (Trustless via Chainlink)
     * Formula: amount = revenue / marketValue
     * @param to Recipient address
     * @param revenue Revenue amount (in wei or base units)
     */
    function revenueMint(address to, uint256 revenue)
        external
        onlyRole(TREASURY_MINTER_ROLE)
        whenNotPaused
    {
        require(revenue > 0, ZeroRevenue());
        _revenueMintLogic(to, revenue);
    }

    /**
     * @dev Internal shared logic for revenue minting
     */
    function _revenueMintLogic(address to, uint256 revenue) internal {
        // 1. Get latest price from Chainlink
        (, int256 price, , , ) = priceFeed.latestRoundData();
        require(price > 0, InvalidOraclePrice());

        // 2. Adjust decimals (Chainlink is 8 decimals, Token is 18)
        uint256 marketValue = uint256(price) * 1e10; 

        // 3. Calculate amount
        uint256 amount = (revenue * 10 ** _DECIMALS) / marketValue;
        require(amount > 0, ZeroMintAmount());

        _mintWithCapCheck(to, amount);

        emit RevenueMint(to, amount, revenue, marketValue);
    }

    /**
     * @dev Update Price Feed Address
     * @param newPriceFeed New Oracle Address
     */
    function setPriceFeed(address newPriceFeed) external onlyRole(DEFAULT_ADMIN_ROLE) {
        require(newPriceFeed != address(0), ZeroAddress());
        priceFeed = AggregatorV3Interface(newPriceFeed);
    }

    function setMintInterval(uint256 newInterval) external onlyRole(DEFAULT_ADMIN_ROLE) {
        mintInterval = newInterval;
    }

    /**
     * @dev Internal mint function with cap enforcement
     * @param to Recipient address
     * @param amount Amount to mint
     */
    function _mintWithCapCheck(address to, uint256 amount) private {
        require(totalMinted + amount <= MAX_SUPPLY, ExceedsMaxSupply());

        totalMinted += amount;
        _mint(to, amount);
    }

    /**
     * @dev Override transfer to implement burn and treasury fees
     * @param from Sender address
     * @param to Recipient address
     * @param amount Amount to transfer
     */
    function _transfer(address from, address to, uint256 amount) internal virtual override {
        require(from != address(0), TransferFromZeroAddress());
        require(to != address(0), TransferToZeroAddress());

        // Check if sender or recipient is exempt from fees
        if (isExemptFromFees[from] || isExemptFromFees[to]) {
            // Exempt transfer - no fees
            super._transfer(from, to, amount);
        } else {
            // Calculate fees
            uint256 burnAmount = (amount * BURN_FEE_PERCENT) / FEE_DENOMINATOR;
            uint256 treasuryAmount = (amount * TREASURY_FEE_PERCENT) / FEE_DENOMINATOR;
            uint256 recipientAmount = amount - burnAmount - treasuryAmount;

            if (burnAmount > 0) {
                _burn(from, burnAmount); // 1% burn (reduces totalSupply)
            }

            if (treasuryAmount > 0) {
                super._transfer(from, treasuryAddress, treasuryAmount); // 1% to treasury
                emit TreasuryFee(from, treasuryAddress, treasuryAmount);
            }

            // Execute transfers
            super._transfer(from, to, recipientAmount); // 98% to recipient
        }
    }

    /**
     * @dev Update treasury address (admin only)
     * @param newTreasury New treasury address
     */
    function updateTreasuryAddress(address newTreasury) external onlyRole(DEFAULT_ADMIN_ROLE) {
        require(newTreasury != address(0), ZeroAddress());

        address oldTreasury = treasuryAddress;

        // Update exemption
        isExemptFromFees[oldTreasury] = false;
        isExemptFromFees[newTreasury] = true;

        treasuryAddress = newTreasury;

        emit TreasuryAddressUpdated(oldTreasury, newTreasury);
        emit ExemptionUpdated(oldTreasury, false);
        emit ExemptionUpdated(newTreasury, true);
    }

    /**
     * @dev Update DAO address (admin only)
     * @param newDAO New DAO address
     */
    function updateDAOAddress(address newDAO) external onlyRole(DEFAULT_ADMIN_ROLE) {
        require(newDAO != address(0), ZeroAddress());

        address oldDAO = daoAddress;

        // Update exemption
        isExemptFromFees[oldDAO] = false;
        isExemptFromFees[newDAO] = true;

        daoAddress = newDAO;

        emit DAOAddressUpdated(oldDAO, newDAO);
        emit ExemptionUpdated(oldDAO, false);
        emit ExemptionUpdated(newDAO, true);
    }

    /**
     * @dev Set exemption status for an address (admin only)
     * @param account Address to update
     * @param exempt Exemption status
     */
    function setExemption(address account, bool exempt) external onlyRole(DEFAULT_ADMIN_ROLE) {
        require(account != address(0), CannotSetExemptionForZeroAddress());
        isExemptFromFees[account] = exempt;
        emit ExemptionUpdated(account, exempt);
    }

    /**
     * @dev Pause contract (emergency stop)
     */
    function pause() external onlyRole(PAUSER_ROLE) {
        _pause();
    }

    /**
     * @dev Unpause contract
     */
    function unpause() external onlyRole(PAUSER_ROLE) {
        _unpause();
    }

    /**
     * @dev Override to add pause functionality to transfers
     */
    function _beforeTokenTransfer(address from, address to, uint256 amount) internal virtual override whenNotPaused {
        super._beforeTokenTransfer(from, to, amount);
    }

    /**
     * @dev Get remaining mintable supply
     */
    function remainingMintableSupply() external view returns (uint256) {
        return MAX_SUPPLY - totalMinted;
    }

    /**
     * @dev Check if minting is still possible
     */
    function canMint(uint256 amount) external view returns (bool) {
        return totalMinted + amount <= MAX_SUPPLY;
    }
}
