// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/access/IAccessControl.sol";

/**
 * @title MockAdmin
 * @dev Mock contract to simulate a multisig admin for testing purposes.
 * This contract satisfies the `code.length > 0` requirement in CAPX and ANGEL.
 */
contract MockAdmin {
    /**
     * @dev Grants a role to an account on the target contract
     * @param target The contract address (CAPX or ANGEL)
     * @param role The role to grant
     * @param account The account to receive the role
     */
    function grantRole(address target, bytes32 role, address account) external {
        IAccessControl(target).grantRole(role, account);
    }

    /**
     * @dev Revokes a role from an account on the target contract
     * @param target The contract address (CAPX or ANGEL)
     * @param role The role to revoke
     * @param account The account to lose the role
     */
    function revokeRole(address target, bytes32 role, address account) external {
        IAccessControl(target).revokeRole(role, account);
    }

    /**
     * @dev Updates treasury address on CAPX contract
     * @param target The CAPX contract address
     * @param newTreasury The new treasury address
     */
    function updateTreasuryAddress(address target, address newTreasury) external {
        (bool success, ) = target.call(
            abi.encodeWithSignature("updateTreasuryAddress(address)", newTreasury)
        );
        require(success, "updateTreasuryAddress failed");
    }

    /**
     * @dev Updates DAO address on CAPX contract
     * @param target The CAPX contract address
     * @param newDAO The new DAO address
     */
    function updateDAOAddress(address target, address newDAO) external {
        (bool success, ) = target.call(
            abi.encodeWithSignature("updateDAOAddress(address)", newDAO)
        );
        require(success, "updateDAOAddress failed");
    }

    /**
     * @dev Sets fee exemption on CAPX contract
     * @param target The CAPX contract address
     * @param account The account to set exemption for
     * @param exempt The exemption status
     */
    function setExemption(address target, address account, bool exempt) external {
        (bool success, ) = target.call(
            abi.encodeWithSignature("setExemption(address,bool)", account, exempt)
        );
        require(success, "setExemption failed");
    }

    /**
     * @dev Pauses the target contract
     * @param target The contract address
     */
    function pause(address target) external {
        (bool success, ) = target.call(abi.encodeWithSignature("pause()"));
        require(success, "pause failed");
    }

    /**
     * @dev Unpauses the target contract
     * @param target The contract address
     */
    function unpause(address target) external {
        (bool success, ) = target.call(abi.encodeWithSignature("unpause()"));
        require(success, "unpause failed");
    }

    /**
     * @dev Mints tokens using teamMint on CAPX
     * @param target The CAPX contract address
     * @param to Recipient address
     * @param amount Amount to mint
     */
    function teamMint(address target, address to, uint256 amount) external {
        (bool success, ) = target.call(
            abi.encodeWithSignature("teamMint(address,uint256)", to, amount)
        );
        require(success, "teamMint failed");
    }

    /**
     * @dev Mints tokens using treasuryMint on CAPX
     * @param target The CAPX contract address
     * @param to Recipient address
     * @param amount Amount to mint
     */
    function treasuryMint(address target, address to, uint256 amount) external {
        (bool success, ) = target.call(
            abi.encodeWithSignature("treasuryMint(address,uint256)", to, amount)
        );
        require(success, "treasuryMint failed");
    }

    /**
     * @dev Mints tokens using daoMint on CAPX
     * @param target The CAPX contract address
     * @param to Recipient address
     * @param amount Amount to mint
     */
    function daoMint(address target, address to, uint256 amount) external {
        (bool success, ) = target.call(
            abi.encodeWithSignature("daoMint(address,uint256)", to, amount)
        );
        require(success, "daoMint failed");
    }

    /**
     * @dev Mints tokens using revenueMint on CAPX
     * @param target The CAPX contract address
     * @param to Recipient address
     * @param revenue Revenue amount
     * @param marketValue Market value per token
     */
    function revenueMint(address target, address to, uint256 revenue, uint256 marketValue) external {
        (bool success, ) = target.call(
            abi.encodeWithSignature("revenueMint(address,uint256,uint256)", to, revenue, marketValue)
        );
        require(success, "revenueMint failed");
    }

    /**
     * @dev Mints tokens using rewardMint on ANGEL
     * @param target The ANGEL contract address
     * @param to Recipient address
     * @param amount Amount to mint
     * @param reason Reason for the mint
     */
    function rewardMint(address target, address to, uint256 amount, string calldata reason) external {
        (bool success, ) = target.call(
            abi.encodeWithSignature("rewardMint(address,uint256,string)", to, amount, reason)
        );
        require(success, "rewardMint failed");
    }

    /**
     * @dev Batch mints tokens using batchRewardMint on ANGEL
     * @param target The ANGEL contract address
     * @param recipients Array of recipient addresses
     * @param amounts Array of amounts to mint
     * @param reason Reason for the mint
     */
    function batchRewardMint(
        address target,
        address[] calldata recipients,
        uint256[] calldata amounts,
        string calldata reason
    ) external {
        (bool success, ) = target.call(
            abi.encodeWithSignature(
                "batchRewardMint(address[],uint256[],string)",
                recipients,
                amounts,
                reason
            )
        );
        require(success, "batchRewardMint failed");
    }

    /**
     * @dev Creates a vesting schedule on TokenVesting contract
     * @param target The TokenVesting contract address
     * @param beneficiary Address of the beneficiary
     * @param token Address of the ERC20 token
     * @param totalAmount Total amount of tokens to vest
     * @param startTime Vesting start timestamp
     * @param cliffDuration Cliff duration in seconds
     * @param duration Total vesting duration in seconds
     * @param stepDuration Step duration for STEP vesting (0 for LINEAR)
     * @param revocable Whether the vesting is revocable
     */
    function createVestingSchedule(
        address target,
        address beneficiary,
        address token,
        uint256 totalAmount,
        uint256 startTime,
        uint256 cliffDuration,
        uint256 duration,
        uint256 stepDuration,
        bool revocable
    ) external {
        (bool success, ) = target.call(
            abi.encodeWithSignature(
                "createVestingSchedule(address,address,uint256,uint256,uint256,uint256,uint256,bool)",
                beneficiary,
                token,
                totalAmount,
                startTime,
                cliffDuration,
                duration,
                stepDuration,
                revocable
            )
        );
        require(success, "createVestingSchedule failed");
    }

    /**
     * @dev Batch creates vesting schedules on TokenVesting contract
     * @param target The TokenVesting contract address
     * @param beneficiaries Array of beneficiary addresses
     * @param token Address of the ERC20 token
     * @param amounts Array of token amounts
     * @param startTime Vesting start timestamp
     * @param cliffDuration Cliff duration in seconds
     * @param duration Total vesting duration in seconds
     * @param stepDuration Step duration for STEP vesting
     * @param revocable Whether the vesting is revocable
     */
    function batchCreateVestingSchedules(
        address target,
        address[] calldata beneficiaries,
        address token,
        uint256[] calldata amounts,
        uint256 startTime,
        uint256 cliffDuration,
        uint256 duration,
        uint256 stepDuration,
        bool revocable
    ) external {
        (bool success, ) = target.call(
            abi.encodeWithSignature(
                "batchCreateVestingSchedules(address[],address,uint256[],uint256,uint256,uint256,uint256,bool)",
                beneficiaries,
                token,
                amounts,
                startTime,
                cliffDuration,
                duration,
                stepDuration,
                revocable
            )
        );
        require(success, "batchCreateVestingSchedules failed");
    }

    /**
     * @dev Revokes a vesting schedule on TokenVesting contract
     * @param target The TokenVesting contract address
     * @param scheduleId ID of the vesting schedule to revoke
     */
    function revokeVesting(address target, uint256 scheduleId) external {
        (bool success, ) = target.call(
            abi.encodeWithSignature("revokeVesting(uint256)", scheduleId)
        );
        require(success, "revokeVesting failed");
    }

    /**
     * @dev Pauses the TokenVesting contract
     * @param target The TokenVesting contract address
     */
    function pauseVesting(address target) external {
        (bool success, ) = target.call(abi.encodeWithSignature("pause()"));
        require(success, "pauseVesting failed");
    }

    /**
     * @dev Unpauses the TokenVesting contract
     * @param target The TokenVesting contract address
     */
    function unpauseVesting(address target) external {
        (bool success, ) = target.call(abi.encodeWithSignature("unpause()"));
        require(success, "unpauseVesting failed");
    }

    /**
     * @dev Withdraws excess tokens from TokenVesting contract
     * @param target The TokenVesting contract address
     * @param token Token address
     * @param recipient Recipient address
     * @param amount Amount to withdraw
     */
    function withdrawExcessTokens(
        address target,
        address token,
        address recipient,
        uint256 amount
    ) external {
        (bool success, ) = target.call(
            abi.encodeWithSignature(
                "withdrawExcessTokens(address,address,uint256)",
                token,
                recipient,
                amount
            )
        );
        require(success, "withdrawExcessTokens failed");
    }

    /**
     * @dev Fallback to receive ETH if needed
     */
    receive() external payable {}
}
