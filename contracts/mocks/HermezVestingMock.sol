// SPDX-License-Identifier: GPL-3.0

pragma solidity 0.6.12;

import "../HermezVesting.sol";

contract HermezVestingMock is HermezVesting {
    uint public currentTimestamp;

    constructor(
        address _distributor,
        uint256 _totalVestedTokens,
        uint256 _startTime,
        uint256 _startToCliff,
        uint256 _startToEnd,
        uint256 _initialPercentage,
        address token
    ) public HermezVesting(_distributor,_totalVestedTokens,_startTime,_startToCliff,_startToEnd,_initialPercentage,token) {}

    function setTimestamp(uint256 timestamp) public {
        currentTimestamp = timestamp;
    }

    function getTimestamp() public override view returns (uint256) {
        return currentTimestamp == 0 ? block.timestamp : currentTimestamp;
    } 
}
