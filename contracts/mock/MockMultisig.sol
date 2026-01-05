// SPDX-License-Identifier: MIT
pragma solidity 0.8.30;

/**
 * @title MockMultisig
 * @notice Simple mock contract to simulate a multisig wallet for testing
 * @dev This contract acts as a proxy to allow EOA-controlled execution for testing purposes
 */
contract MockMultisig {
    ///////////////// STATE VARIABLES /////////////////

    address public owner;

    ///////////////// CONSTRUCTOR /////////////////

    /**
     * @notice Initialize the mock multisig with an owner
     * @param _owner The EOA that controls this multisig for testing
     */
    constructor(address _owner) {
        owner = _owner;
    }

    ///////////////// MODIFIERS /////////////////

    modifier onlyOwner() {
        require(msg.sender == owner, "Not owner");
        _;
    }

    ///////////////// FUNCTIONS /////////////////

    /**
     * @notice Execute an arbitrary call from this multisig
     * @param target Target contract address
     * @param data Calldata to send
     */
    function execute(address target, bytes calldata data) external payable onlyOwner returns (bytes memory) {
        (bool success, bytes memory result) = target.call{value: msg.value}(data);
        if (!success) {
            // Bubble up the revert reason
            assembly {
                revert(add(result, 32), mload(result))
            }
        }
        return result;
    }

    /**
     * @notice Allow receiving ETH
     */
    receive() external payable {}
}
