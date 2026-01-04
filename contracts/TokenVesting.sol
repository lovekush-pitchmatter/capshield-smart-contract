// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/security/Pausable.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";

/**
 * @title TokenVesting
 * @dev Production-ready token vesting contract with cliff and linear/step unlock mechanisms
 * 
 * Features:
 * - Cliff period support (initial lock period)
 * - Linear vesting (continuous unlock over time)
 * - Step vesting (unlock at specific intervals)
 * - Multi-beneficiary support
 * - Revocable vesting schedules
 * - Secure claim mechanism with reentrancy protection
 * - Role-based access control
 * - Emergency pause functionality
 * - Works with any ERC20 token (ANGEL, CAPX, etc.)
 */
contract TokenVesting is AccessControl, Pausable, ReentrancyGuard {
    using SafeERC20 for IERC20;

    // Role definitions
    bytes32 public constant VESTING_ADMIN_ROLE = keccak256("VESTING_ADMIN_ROLE");
    bytes32 public constant PAUSER_ROLE = keccak256("PAUSER_ROLE");

    // Vesting types
    enum VestingType {
        LINEAR,  // Continuous linear unlock over duration
        STEP     // Unlock at specific intervals
    }

    // Vesting schedule structure
    struct VestingSchedule {
        address beneficiary;           // Address of the beneficiary
        address token;                 // ERC20 token address
        uint256 totalAmount;           // Total tokens to be vested
        uint256 startTime;             // Vesting start timestamp
        uint256 cliffDuration;         // Cliff period in seconds (no tokens released during cliff)
        uint256 duration;              // Total vesting duration in seconds (excluding cliff)
        uint256 stepDuration;          // Duration of each step for STEP vesting (0 for LINEAR)
        uint256 claimed;               // Total tokens claimed so far
        VestingType vestingType;       // Type of vesting (LINEAR or STEP)
        bool revocable;                // Whether the vesting can be revoked
        bool revoked;                  // Whether the vesting has been revoked
    }

    // Mapping: beneficiary => token => vesting schedule IDs
    mapping(address => mapping(address => uint256[])) private beneficiaryVestingIds;

    // Mapping: vesting schedule ID => vesting schedule
    mapping(uint256 => VestingSchedule) public vestingSchedules;

    // Counter for vesting schedule IDs
    uint256 private vestingScheduleIdCounter;

    // Total tokens held in vesting per token address
    mapping(address => uint256) public totalVestedTokens;

    // Events
    event VestingScheduleCreated(
        uint256 indexed scheduleId,
        address indexed beneficiary,
        address indexed token,
        uint256 totalAmount,
        uint256 startTime,
        uint256 cliffDuration,
        uint256 duration,
        VestingType vestingType,
        bool revocable
    );

    event TokensClaimed(
        uint256 indexed scheduleId,
        address indexed beneficiary,
        address indexed token,
        uint256 amount,
        uint256 timestamp
    );

    event VestingRevoked(
        uint256 indexed scheduleId,
        address indexed beneficiary,
        address indexed token,
        uint256 vestedAmount,
        uint256 refundedAmount,
        uint256 timestamp
    );

    event TokensWithdrawn(
        address indexed token,
        address indexed recipient,
        uint256 amount
    );

    /**
     * @dev Constructor - initializes with admin address
     * @param _adminAddress Address of the admin (should be multisig)
     */
    constructor(address _adminAddress) {
        require(_adminAddress != address(0), "Admin address cannot be zero");
        require(_adminAddress.code.length > 0, "Admin must be multisig/contract");

        _grantRole(DEFAULT_ADMIN_ROLE, _adminAddress);
        _grantRole(VESTING_ADMIN_ROLE, _adminAddress);
        _grantRole(PAUSER_ROLE, _adminAddress);
    }

    /**
     * @dev Creates a new vesting schedule
     * @param _beneficiary Address of the beneficiary
     * @param _token Address of the ERC20 token
     * @param _totalAmount Total amount of tokens to vest
     * @param _startTime Vesting start timestamp (use block.timestamp for immediate start)
     * @param _cliffDuration Cliff duration in seconds
     * @param _duration Total vesting duration in seconds (excluding cliff)
     * @param _stepDuration Step duration for STEP vesting (0 for LINEAR vesting)
     * @param _revocable Whether the vesting is revocable
     * @return scheduleId The ID of the created vesting schedule
     */
    function createVestingSchedule(
        address _beneficiary,
        address _token,
        uint256 _totalAmount,
        uint256 _startTime,
        uint256 _cliffDuration,
        uint256 _duration,
        uint256 _stepDuration,
        bool _revocable
    ) external onlyRole(VESTING_ADMIN_ROLE) whenNotPaused returns (uint256 scheduleId) {
        require(_beneficiary != address(0), "Beneficiary cannot be zero address");
        require(_token != address(0), "Token cannot be zero address");
        require(_totalAmount > 0, "Amount must be greater than 0");
        require(_duration > 0, "Duration must be greater than 0");
        require(_startTime >= block.timestamp, "Start time cannot be in the past");

        // Validate vesting type based on stepDuration
        VestingType vestingType;
        if (_stepDuration == 0) {
            vestingType = VestingType.LINEAR;
        } else {
            require(_stepDuration <= _duration, "Step duration cannot exceed total duration");
            require(_duration % _stepDuration == 0, "Duration must be divisible by step duration");
            vestingType = VestingType.STEP;
        }

        // Transfer tokens from sender to this contract
        IERC20(_token).safeTransferFrom(msg.sender, address(this), _totalAmount);

        // Create vesting schedule
        scheduleId = vestingScheduleIdCounter++;

        vestingSchedules[scheduleId] = VestingSchedule({
            beneficiary: _beneficiary,
            token: _token,
            totalAmount: _totalAmount,
            startTime: _startTime,
            cliffDuration: _cliffDuration,
            duration: _duration,
            stepDuration: _stepDuration,
            claimed: 0,
            vestingType: vestingType,
            revocable: _revocable,
            revoked: false
        });

        // Track vesting schedules per beneficiary
        beneficiaryVestingIds[_beneficiary][_token].push(scheduleId);

        // Update total vested tokens
        totalVestedTokens[_token] += _totalAmount;

        emit VestingScheduleCreated(
            scheduleId,
            _beneficiary,
            _token,
            _totalAmount,
            _startTime,
            _cliffDuration,
            _duration,
            vestingType,
            _revocable
        );

        return scheduleId;
    }

    /**
     * @dev Batch create multiple vesting schedules
     * @param _beneficiaries Array of beneficiary addresses
     * @param _token Address of the ERC20 token (same for all schedules)
     * @param _amounts Array of token amounts
     * @param _startTime Vesting start timestamp (same for all schedules)
     * @param _cliffDuration Cliff duration in seconds (same for all schedules)
     * @param _duration Total vesting duration in seconds (same for all schedules)
     * @param _stepDuration Step duration (same for all schedules)
     * @param _revocable Whether vesting is revocable (same for all schedules)
     * @return scheduleIds Array of created vesting schedule IDs
     */
    function batchCreateVestingSchedules(
        address[] calldata _beneficiaries,
        address _token,
        uint256[] calldata _amounts,
        uint256 _startTime,
        uint256 _cliffDuration,
        uint256 _duration,
        uint256 _stepDuration,
        bool _revocable
    ) external onlyRole(VESTING_ADMIN_ROLE) whenNotPaused returns (uint256[] memory scheduleIds) {
        require(_beneficiaries.length == _amounts.length, "Arrays length mismatch");
        require(_beneficiaries.length > 0, "Empty arrays");

        uint256 totalAmount = 0;
        for (uint256 i = 0; i < _amounts.length; i++) {
            totalAmount += _amounts[i];
        }

        // Transfer total tokens once
        IERC20(_token).safeTransferFrom(msg.sender, address(this), totalAmount);

        scheduleIds = new uint256[](_beneficiaries.length);

        for (uint256 i = 0; i < _beneficiaries.length; i++) {
            require(_beneficiaries[i] != address(0), "Beneficiary cannot be zero address");
            require(_amounts[i] > 0, "Amount must be greater than 0");

            // Validate vesting type
            VestingType vestingType;
            if (_stepDuration == 0) {
                vestingType = VestingType.LINEAR;
            } else {
                require(_stepDuration <= _duration, "Step duration cannot exceed total duration");
                require(_duration % _stepDuration == 0, "Duration must be divisible by step duration");
                vestingType = VestingType.STEP;
            }

            uint256 scheduleId = vestingScheduleIdCounter++;

            vestingSchedules[scheduleId] = VestingSchedule({
                beneficiary: _beneficiaries[i],
                token: _token,
                totalAmount: _amounts[i],
                startTime: _startTime,
                cliffDuration: _cliffDuration,
                duration: _duration,
                stepDuration: _stepDuration,
                claimed: 0,
                vestingType: vestingType,
                revocable: _revocable,
                revoked: false
            });

            beneficiaryVestingIds[_beneficiaries[i]][_token].push(scheduleId);
            totalVestedTokens[_token] += _amounts[i];

            scheduleIds[i] = scheduleId;

            emit VestingScheduleCreated(
                scheduleId,
                _beneficiaries[i],
                _token,
                _amounts[i],
                _startTime,
                _cliffDuration,
                _duration,
                vestingType,
                _revocable
            );
        }

        return scheduleIds;
    }

    /**
     * @dev Claim vested tokens for a specific schedule
     * @param _scheduleId ID of the vesting schedule
     */
    function claim(uint256 _scheduleId) external nonReentrant whenNotPaused {
        VestingSchedule storage schedule = vestingSchedules[_scheduleId];

        require(schedule.beneficiary == msg.sender, "Only beneficiary can claim");
        require(!schedule.revoked, "Vesting has been revoked");

        uint256 claimableAmount = _computeClaimableAmount(schedule);
        require(claimableAmount > 0, "No tokens available to claim");

        // Update claimed amount
        schedule.claimed += claimableAmount;

        // Update total vested tokens
        totalVestedTokens[schedule.token] -= claimableAmount;

        // Transfer tokens to beneficiary
        IERC20(schedule.token).safeTransfer(schedule.beneficiary, claimableAmount);

        emit TokensClaimed(
            _scheduleId,
            schedule.beneficiary,
            schedule.token,
            claimableAmount,
            block.timestamp
        );
    }

    /**
     * @dev Batch claim tokens from multiple vesting schedules
     * @param _scheduleIds Array of vesting schedule IDs
     */
    function batchClaim(uint256[] calldata _scheduleIds) external nonReentrant whenNotPaused {
        require(_scheduleIds.length > 0, "Empty schedule IDs array");

        for (uint256 i = 0; i < _scheduleIds.length; i++) {
            VestingSchedule storage schedule = vestingSchedules[_scheduleIds[i]];

            require(schedule.beneficiary == msg.sender, "Only beneficiary can claim");
            require(!schedule.revoked, "Vesting has been revoked");

            uint256 claimableAmount = _computeClaimableAmount(schedule);

            if (claimableAmount > 0) {
                schedule.claimed += claimableAmount;
                totalVestedTokens[schedule.token] -= claimableAmount;

                IERC20(schedule.token).safeTransfer(schedule.beneficiary, claimableAmount);

                emit TokensClaimed(
                    _scheduleIds[i],
                    schedule.beneficiary,
                    schedule.token,
                    claimableAmount,
                    block.timestamp
                );
            }
        }
    }

    /**
     * @dev Revoke a vesting schedule (admin only)
     * @param _scheduleId ID of the vesting schedule to revoke
     */
    function revokeVesting(uint256 _scheduleId) external onlyRole(VESTING_ADMIN_ROLE) nonReentrant {
        VestingSchedule storage schedule = vestingSchedules[_scheduleId];

        require(schedule.revocable, "Vesting is not revocable");
        require(!schedule.revoked, "Vesting already revoked");

        // Calculate vested amount up to this point
        uint256 vestedAmount = _computeVestedAmount(schedule);
        uint256 claimableAmount = vestedAmount - schedule.claimed;
        uint256 refundAmount = schedule.totalAmount - vestedAmount;

        // Mark as revoked
        schedule.revoked = true;

        // Transfer claimable amount to beneficiary (if any)
        if (claimableAmount > 0) {
            IERC20(schedule.token).safeTransfer(schedule.beneficiary, claimableAmount);
            schedule.claimed += claimableAmount;
            totalVestedTokens[schedule.token] -= claimableAmount;
        }

        // Refund unvested tokens to admin
        if (refundAmount > 0) {
            IERC20(schedule.token).safeTransfer(msg.sender, refundAmount);
            totalVestedTokens[schedule.token] -= refundAmount;
        }

        emit VestingRevoked(
            _scheduleId,
            schedule.beneficiary,
            schedule.token,
            vestedAmount,
            refundAmount,
            block.timestamp
        );
    }

    /**
     * @dev Withdraw excess tokens not allocated to any vesting schedule (emergency function)
     * @param _token Token address
     * @param _recipient Recipient address
     * @param _amount Amount to withdraw
     */
    function withdrawExcessTokens(
        address _token,
        address _recipient,
        uint256 _amount
    ) external onlyRole(DEFAULT_ADMIN_ROLE) {
        require(_recipient != address(0), "Recipient cannot be zero address");

        uint256 balance = IERC20(_token).balanceOf(address(this));
        uint256 availableAmount = balance - totalVestedTokens[_token];

        require(_amount <= availableAmount, "Insufficient excess tokens");

        IERC20(_token).safeTransfer(_recipient, _amount);

        emit TokensWithdrawn(_token, _recipient, _amount);
    }

    /**
     * @dev Get vesting schedules for a beneficiary and token
     * @param _beneficiary Beneficiary address
     * @param _token Token address
     * @return Array of vesting schedule IDs
     */
    function getVestingScheduleIds(
        address _beneficiary,
        address _token
    ) external view returns (uint256[] memory) {
        return beneficiaryVestingIds[_beneficiary][_token];
    }

    /**
     * @dev Get claimable amount for a vesting schedule
     * @param _scheduleId ID of the vesting schedule
     * @return Claimable token amount
     */
    function getClaimableAmount(uint256 _scheduleId) external view returns (uint256) {
        VestingSchedule storage schedule = vestingSchedules[_scheduleId];
        if (schedule.revoked) {
            return 0;
        }
        return _computeClaimableAmount(schedule);
    }

    /**
     * @dev Get vested amount for a vesting schedule
     * @param _scheduleId ID of the vesting schedule
     * @return Vested token amount
     */
    function getVestedAmount(uint256 _scheduleId) external view returns (uint256) {
        VestingSchedule storage schedule = vestingSchedules[_scheduleId];
        if (schedule.revoked) {
            return schedule.claimed;
        }
        return _computeVestedAmount(schedule);
    }

    /**
     * @dev Get detailed information about a vesting schedule
     * @param _scheduleId ID of the vesting schedule
     * @return schedule The vesting schedule details
     */
    function getVestingSchedule(uint256 _scheduleId) external view returns (VestingSchedule memory) {
        return vestingSchedules[_scheduleId];
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
     * @dev Internal function to compute claimable amount
     * @param schedule Vesting schedule
     * @return Claimable amount
     */
    function _computeClaimableAmount(VestingSchedule storage schedule) private view returns (uint256) {
        uint256 vestedAmount = _computeVestedAmount(schedule);
        return vestedAmount - schedule.claimed;
    }

    /**
     * @dev Internal function to compute vested amount based on vesting type
     * @param schedule Vesting schedule
     * @return Vested amount
     */
    function _computeVestedAmount(VestingSchedule storage schedule) private view returns (uint256) {
        if (block.timestamp < schedule.startTime) {
            return 0;
        }

        uint256 cliffEnd = schedule.startTime + schedule.cliffDuration;

        // Before cliff ends, no tokens are vested
        if (block.timestamp < cliffEnd) {
            return 0;
        }

        uint256 vestingEnd = schedule.startTime + schedule.cliffDuration + schedule.duration;

        // After vesting ends, all tokens are vested
        if (block.timestamp >= vestingEnd) {
            return schedule.totalAmount;
        }

        // Calculate vested amount based on vesting type
        uint256 elapsedTime = block.timestamp - cliffEnd;

        if (schedule.vestingType == VestingType.LINEAR) {
            // Linear vesting: proportional to elapsed time
            return (schedule.totalAmount * elapsedTime) / schedule.duration;
        } else {
            // Step vesting: unlock at intervals
            uint256 completedSteps = elapsedTime / schedule.stepDuration;
            uint256 totalSteps = schedule.duration / schedule.stepDuration;
            return (schedule.totalAmount * completedSteps) / totalSteps;
        }
    }

    /**
     * @dev Get total number of vesting schedules created
     * @return Total count
     */
    function getTotalVestingSchedules() external view returns (uint256) {
        return vestingScheduleIdCounter;
    }
}
