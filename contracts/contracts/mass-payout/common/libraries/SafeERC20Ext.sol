// SPDX-License-Identifier: Apache-2.0
pragma solidity 0.8.22;

import { IERC20 } from "@openzeppelin/contracts/token/ERC20/IERC20.sol";

/**
 * @dev Extension to OZ 4.x SafeERC20 adding `trySafeTransfer` (available natively in OZ 5.x).
 *      Returns false instead of reverting when the ERC-20 transfer fails or returns false.
 */
library SafeERC20Ext {
    function trySafeTransfer(IERC20 token, address to, uint256 value) internal returns (bool) {
        (bool success, bytes memory returndata) = address(token).call(
            abi.encodeWithSelector(token.transfer.selector, to, value)
        );
        return success && (returndata.length == 0 ? address(token).code.length > 0 : abi.decode(returndata, (bool)));
    }
}
